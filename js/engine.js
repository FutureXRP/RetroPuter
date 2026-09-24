/* RetroPuter engine: shared by every year. Each year lives in js/eras/<year>.js
   and registers itself on window.RETRO_ERAS before this file runs. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pick = a => a[Math.random() * a.length | 0];

/* ---------- eras ---------- */
const ERAS = {};
(window.RETRO_ERAS || []).forEach(e => { ERAS[e.id] = e; });
const ERA_IDS = Object.keys(ERAS).sort();
let era = null;

/* ---------- storage ---------- */
// The 'r1990:' prefix predates the other years; it's kept so saved notes and scores survive.
const store = {
  get(k, d) { try { const v = localStorage.getItem('r1990:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('r1990:' + k, JSON.stringify(v)); } catch (e) {} }
};
// Per-year keys. 1990 keeps its original unprefixed keys.
const ek = k => era.id === '1990' ? k : era.id + ':' + k;
const estore = { get: (k, d) => store.get(ek(k), d), set: (k, v) => store.set(ek(k), v) };
const settings = Object.assign({ crt: true, vol: 0.6, saver: true, eras: {} }, store.get('settings', {}));
if (!settings.eras) settings.eras = {};
const saveSettings = () => store.set('settings', settings);
function eraCfg() {
  let c = settings.eras[era.id];
  if (!c) {
    c = settings.eras[era.id] = { wall: era.walls[0][0], bps: era.modem.def };
    if (era.id === '1990' && settings.wall) c.wall = settings.wall;
  }
  if (!era.modem.options.some(o => o.v === c.bps)) c.bps = era.modem.def;
  if (!era.walls.some(w => w[0] === c.wall)) c.wall = era.walls[0][0];
  return c;
}
const conn = () => era.modem.options.find(o => o.v === eraCfg().bps) || era.modem.options[0];
const effBps = () => conn().eff || conn().v;
function fmtBps(v) {
  if (v >= 1000000) return (v / 1000000).toLocaleString() + ' Mbps';
  if (v >= 100000) return Math.round(v / 1000) + ' Kbps';
  return Number(v).toLocaleString() + ' bps';
}

/* ---------- audio ---------- */
let ac = null, master = null, noiseBuf = null;
function audio() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    master = ac.createGain(); master.gain.value = settings.vol; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function env(g, t, dur, v, o) {
  g.gain.setValueAtTime(0.0001, t);
  if (o.decay) {
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  } else {
    const a = o.attack || 0.004, r = o.release || 0.02;
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, t + Math.max(dur - r, a + 0.001));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
}
function tone(f, dur, o = {}) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (o.at || 0);
  const osc = a.createOscillator(); osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = a.createGain(); env(g, t, dur, o.vol ?? 0.1, o);
  osc.connect(g); g.connect(o.dest || master);
  osc.start(t); osc.stop(t + dur + 0.05);
  return osc;
}
function noise(dur, o = {}) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + (o.at || 0);
  const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.value = o.f || 2000; f.Q.value = o.q || 1;
  const g = a.createGain(); env(g, t, dur, o.vol ?? 0.2, o);
  src.connect(f); f.connect(g); g.connect(o.dest || master);
  src.start(t, Math.random()); src.stop(t + dur + 0.05);
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const sfx = {
  click() { noise(0.014, { ft: 'highpass', f: 2600, vol: 0.18, decay: 1 }); },
  key() { noise(0.02, { ft: 'bandpass', f: 1400, q: 1.5, vol: 0.3, decay: 1 }); },
  beep() { tone(880, 0.16, { vol: 0.07 }); },
  seek(n = 6) { for (let i = 0; i < n; i++) noise(0.016, { at: i * 0.055 + Math.random() * 0.05, f: 1100 + Math.random() * 2200, q: 2.5, vol: 0.32, decay: 1 }); },
  floppy() {
    for (let i = 0; i < 10; i++) tone(i % 2 ? 95 : 72, 0.05, { at: i * 0.085, vol: 0.06 });
    for (let i = 0; i < 16; i++) noise(0.025, { at: 0.95 + i * 0.05, f: 500, q: 3, vol: 0.35, decay: 1 });
    for (let i = 0; i < 6; i++) tone(i % 2 ? 110 : 80, 0.06, { at: 1.9 + i * 0.1, vol: 0.05 });
  },
  cdrom() {
    noise(1.6, { ft: 'bandpass', f: 380, q: 4, vol: 0.12, attack: 0.5, release: 0.5 });
    tone(90, 1.6, { to: 240, type: 'sine', vol: 0.03, attack: 0.6, release: 0.4 });
  },
  chime() {
    const notes = [[60, 0], [67, 0.14], [64, 0.28], [72, 0.46], [71, 0.78], [76, 1.0]];
    notes.forEach(([n, at]) => {
      tone(midi(n), 2.6, { at, type: 'triangle', vol: 0.09, decay: 1 });
      tone(midi(n - 12), 2.2, { at, type: 'sine', vol: 0.05, decay: 1 });
      tone(midi(n), 2.0, { at: at + 0.2, type: 'sine', vol: 0.025, decay: 1 });
    });
  },
  chime95() {
    [55, 62, 67, 71, 74].forEach((n, i) => {
      tone(midi(n), 4.6 - i * 0.2, { at: i * 0.2, type: 'sine', vol: 0.055, attack: 0.5, release: 2.2 });
      tone(midi(n + 12), 3.2, { at: i * 0.2 + 0.05, type: 'triangle', vol: 0.03, decay: 1 });
    });
    [79, 83, 86, 91].forEach((n, i) => tone(midi(n), 1.8, { at: 1.5 + i * 0.16, type: 'sine', vol: 0.035, decay: 1 }));
    noise(3, { at: 0.3, ft: 'highpass', f: 7000, vol: 0.025, attack: 1, release: 1.8 });
  },
  chime2000() {
    [64, 68, 71, 76, 80].forEach((n, i) => tone(midi(n), 0.9, { at: i * 0.075, type: 'triangle', vol: 0.07, decay: 1 }));
    [52, 64, 71, 76, 80].forEach(n => tone(midi(n), 3.4, { at: 0.45, type: 'sine', vol: 0.05, attack: 0.25, release: 2 }));
    [88, 92, 95].forEach((n, i) => tone(midi(n), 1.2, { at: 0.9 + i * 0.12, type: 'sine', vol: 0.025, decay: 1 }));
  },
  bye() {
    [[76, 0], [71, 0.22], [67, 0.44], [64, 0.66], [60, 0.9]].forEach(([n, at]) => {
      tone(midi(n), 1.8, { at, type: 'triangle', vol: 0.09, decay: 1 });
      tone(midi(n - 12), 1.6, { at, type: 'sine', vol: 0.04, decay: 1 });
    });
  },
  bye95() { [74, 71, 67, 62, 55].forEach((n, i) => tone(midi(n), 2.6, { at: i * 0.22, type: 'sine', vol: 0.05, attack: 0.2, release: 1.6 })); },
  bye2000() { [80, 76, 71, 68, 64].forEach((n, i) => tone(midi(n), 1.4, { at: i * 0.12, type: 'triangle', vol: 0.06, decay: 1 })); tone(midi(52), 2.4, { at: 0.6, type: 'sine', vol: 0.05, attack: 0.2, release: 1.6 }); },
  ding() { tone(1318.5, 0.7, { type: 'triangle', vol: 0.12, decay: 1 }); tone(1975.5, 0.5, { type: 'sine', vol: 0.05, decay: 1, at: 0.01 }); },
  tada() {
    [72, 76, 79].forEach((n, i) => tone(midi(n), 0.12, { at: i * 0.09, type: 'triangle', vol: 0.1 }));
    [72, 76, 79, 84].forEach(n => tone(midi(n), 1.2, { at: 0.3, type: 'triangle', vol: 0.07, decay: 1 }));
  },
  boom() { noise(1.3, { ft: 'lowpass', f: 900, q: 0.7, vol: 0.7, decay: 1 }); tone(110, 0.7, { to: 30, type: 'sawtooth', vol: 0.18, decay: 1 }); },
  blip(f = 660) { tone(f, 0.05, { vol: 0.06 }); },
  crash() { [440, 330, 247, 165].forEach((f, i) => tone(f, 0.16, { at: i * 0.16, vol: 0.07 })); },
  door() { noise(0.5, { ft: 'bandpass', f: 600, q: 2, vol: 0.25, attack: 0.05, release: 0.35 }); tone(300, 0.35, { to: 700, type: 'sine', vol: 0.05, decay: 1, at: 0.05 }); },
  knock() { [0, 0.16].forEach(at => { noise(0.05, { at, ft: 'lowpass', f: 500, vol: 0.6, decay: 1 }); tone(140, 0.08, { at, type: 'sine', vol: 0.2, decay: 1 }); }); },
  msg() { tone(midi(79), 0.09, { type: 'sine', vol: 0.08 }); tone(midi(84), 0.14, { at: 0.09, type: 'sine', vol: 0.08, decay: 1 }); },
  sent() { tone(midi(72), 0.07, { type: 'sine', vol: 0.05, decay: 1 }); }
};

/* ---------- modem ---------- */
const DTMF = { '1':[697,1209],'2':[697,1336],'3':[697,1477],'4':[770,1209],'5':[770,1336],'6':[770,1477],'7':[852,1209],'8':[852,1336],'9':[852,1477],'*':[941,1209],'0':[941,1336],'#':[941,1477] };
function dual(f1, f2, dur, at, dest, vol) { tone(f1, dur, { at, dest, vol, type: 'sine' }); tone(f2, dur, { at, dest, vol, type: 'sine' }); }
function fsk(at, dur, pair, dest, vol) {
  const a = audio(); const t0 = a.currentTime + at;
  const osc = a.createOscillator(); osc.type = 'sine';
  for (let t = 0; t < dur; t += 1 / 300) osc.frequency.setValueAtTime(pair[Math.random() < 0.5 ? 0 : 1], t0 + t);
  const g = a.createGain(); env(g, t0, dur, vol, {});
  osc.connect(g); g.connect(dest); osc.start(t0); osc.stop(t0 + dur + 0.05);
}
/* profile: 'v22' (1,200-2,400), 'v32' (9,600-14,400), 'v34' (28,800-33,600), 'v90' (56K).
   Faster modems had longer, noisier handshakes. */
function modemCall(number, onStatus, profile) {
  const a = audio();
  const bus = a ? a.createGain() : null;
  if (bus) bus.connect(master);
  const timers = [];
  let resolve;
  const done = new Promise(r => (resolve = r));
  const at = (s, fn) => timers.push(setTimeout(fn, s * 1000));
  let t = 0;
  if (a) {
    noise(0.04, { dest: bus, f: 700, vol: 0.4, decay: 1 });
    t = 0.3; dual(350, 440, 1.3, t, bus, 0.06);
  }
  at(0, () => onStatus('Picking up the phone line…'));
  t = 1.8;
  at(t, () => onStatus('Dialing ' + number + '…'));
  for (const ch of number) { if (DTMF[ch]) { if (a) dual(DTMF[ch][0], DTMF[ch][1], 0.09, t, bus, 0.08); t += 0.15; } }
  t += 0.5;
  at(t, () => onStatus('Ringing…'));
  if (a) dual(440, 480, 1.2, t, bus, 0.035);
  t += 1.9;
  at(t, () => onStatus('The other computer answered.'));
  const slow = profile === 'v22' || profile === 'v32';
  if (a) tone(2100, slow ? 1.6 : 2.1, { at: t, type: 'sine', vol: 0.08, dest: bus });
  t += slow ? 1.7 : 2.2;
  at(t, () => onStatus('Negotiating protocols…'));
  if (slow) {
    if (a) { noise(1.4, { at: t, dest: bus, f: 1200, q: 3, vol: 0.3 }); noise(1.4, { at: t, dest: bus, f: 2400, q: 3, vol: 0.22 }); }
    t += 1.5;
    if (profile === 'v32') {
      at(t, () => onStatus('Training modems (that hissing is them talking)…'));
      if (a) noise(1.3, { at: t, dest: bus, f: 1800, q: 0.55, vol: 0.35 });
      t += 1.4;
    }
  } else {
    if (a) { fsk(t, 1.1, [980, 1180], bus, 0.06); fsk(t + 0.05, 1.0, [1650, 1850], bus, 0.045); }
    t += 1.15;
    if (a) for (let i = 0; i < 3; i++) { tone(1200, 0.24, { at: t + i * 0.3, type: 'sine', vol: 0.07, dest: bus }); tone(2400, 0.24, { at: t + i * 0.3, type: 'sine', vol: 0.045, dest: bus }); }
    t += 1.0;
    if (a) for (let i = 0; i < 12; i++) tone(350 + i * 260, 0.08, { at: t + i * 0.055, type: 'sine', vol: 0.05, dest: bus });
    t += 0.75;
    at(t, () => onStatus('Training modems (that hissing is them talking)…'));
    if (a) { noise(1.9, { at: t, dest: bus, f: 1800, q: 0.55, vol: 0.4 }); tone(1800, 1.9, { at: t, type: 'sine', vol: 0.025, dest: bus }); }
    t += 2.0;
    if (profile === 'v90') {
      at(t, () => onStatus('Trying for 56K…'));
      if (a) { tone(1375, 0.35, { at: t, type: 'sine', vol: 0.07, dest: bus }); tone(2002, 0.35, { at: t + 0.3, type: 'sine', vol: 0.06, dest: bus }); noise(1.4, { at: t + 0.7, dest: bus, f: 2600, q: 0.8, vol: 0.32 }); }
      t += 2.2;
    }
    if (a) noise(1.5, { at: t, dest: bus, ft: 'highpass', f: 900, q: 0.3, vol: 0.3 });
    t += 1.6;
  }
  at(t, () => onStatus('Verifying user name and password…'));
  t += slow ? 1.4 : 1.7;
  at(t, () => resolve(true));
  return { done, cancel() { timers.forEach(clearTimeout); if (bus) { try { bus.disconnect(); } catch (e) {} } resolve(false); } };
}
function dslCall(onStatus) {
  const timers = []; let resolve;
  const done = new Promise(r => (resolve = r));
  const at = (s, fn) => timers.push(setTimeout(fn, s * 1000));
  noise(0.03, { ft: 'highpass', f: 3000, vol: 0.3, decay: 1 });
  at(0, () => onStatus('Checking the DSL line…'));
  at(0.8, () => { onStatus('Syncing with the phone company (no dialing needed)…'); sfx.blip(990); });
  at(1.8, () => { onStatus('Getting an Internet address…'); sfx.blip(1320); });
  at(2.5, () => resolve(true));
  return { done, cancel() { timers.forEach(clearTimeout); resolve(false); } };
}
const net = { connected: false, since: 0, dropped: false, dropTimer: null };

/* ---------- icons ---------- */
const svg = (inner, vb = '0 0 32 32') => `<svg viewBox="${vb}" shape-rendering="crispEdges" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  dial: svg('<rect x="3" y="17" width="26" height="10" fill="#c0c0c0" stroke="#000"/><rect x="4" y="18" width="24" height="1" fill="#fff"/><rect x="6" y="22" width="3" height="2" fill="#0c0"/><rect x="11" y="22" width="3" height="2" fill="#f00"/><rect x="16" y="22" width="3" height="2" fill="#ff0"/><rect x="21" y="21" width="5" height="4" fill="#808080"/><path d="M6 13 Q16 3 26 13 L26 16 L21 16 L21 13 Q16 10 11 13 L11 16 L6 16 Z" fill="#000"/>'),
  web: svg('<circle cx="16" cy="16" r="13" fill="#0050c8" stroke="#000"/><path d="M8 9h7v4h-3v5H8zM18 7h5v3h3v6h-4v-3h-4zM14 20h6v6h-4v-2h-2zM24 19h3l-2 5h-1z" fill="#1ca01c"/><ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="#9cf" stroke-width=".8"/><line x1="3" y1="16" x2="29" y2="16" stroke="#9cf" stroke-width=".8"/>'),
  mines: svg('<g stroke="#000" stroke-width="2"><line x1="16" y1="3" x2="16" y2="29"/><line x1="3" y1="16" x2="29" y2="16"/><line x1="7" y1="7" x2="25" y2="25"/><line x1="25" y1="7" x2="7" y2="25"/></g><circle cx="16" cy="16" r="9" fill="#000"/><rect x="11" y="11" width="4" height="4" fill="#fff"/>'),
  worm: svg('<rect x="0" y="0" width="32" height="32" fill="#0000a8"/><rect x="2" y="2" width="28" height="28" fill="none" stroke="#a80000" stroke-width="2"/><path d="M6 24h4v-4h4v-4h4v-4h4v-4h4v4h-4v4h-4v4h-4v4h-4v4H6z" fill="#fcfc54"/><rect x="22" y="8" width="2" height="2" fill="#000"/><text x="8" y="14" font-size="8" fill="#fff" font-family="monospace">5</text>'),
  paint: svg('<path d="M4 18 C4 8 26 6 28 16 C29 22 22 20 20 24 C18 29 4 28 4 18Z" fill="#e8c890" stroke="#000"/><circle cx="10" cy="14" r="2.5" fill="#f00"/><circle cx="16" cy="11" r="2.5" fill="#00f"/><circle cx="22" cy="12" r="2.5" fill="#ff0"/><circle cx="9" cy="21" r="2.5" fill="#0a0"/><rect x="18" y="2" width="3" height="16" transform="rotate(30 19 10)" fill="#800000"/><rect x="24" y="15" width="3" height="4" transform="rotate(30 25 17)" fill="#000"/>'),
  note: svg('<rect x="6" y="4" width="20" height="25" fill="#fff" stroke="#000"/><g fill="#008">' + [10,14,18,22].map(y => `<rect x="9" y="${y}" width="14" height="1"/>`).join('') + '</g><g fill="#808080">' + [8,12,16,20,24].map(x => `<rect x="${x}" y="2" width="2" height="4"/>`).join('') + '</g>'),
  cp: svg('<rect x="4" y="5" width="24" height="22" fill="#c0c0c0" stroke="#000"/><rect x="5" y="6" width="22" height="1" fill="#fff"/><g fill="#000"><rect x="9" y="9" width="1" height="15"/><rect x="16" y="9" width="1" height="15"/><rect x="23" y="9" width="1" height="15"/></g><g fill="#000080"><rect x="7" y="18" width="5" height="3"/><rect x="14" y="11" width="5" height="3"/><rect x="21" y="15" width="5" height="3"/></g>'),
  dl: svg('<rect x="4" y="10" width="24" height="17" fill="#ffd84d" stroke="#000"/><rect x="4" y="7" width="10" height="4" fill="#ffd84d" stroke="#000"/><path d="M13 12h6v6h4l-7 7-7-7h4z" fill="#008000" stroke="#000"/>'),
  info: svg('<circle cx="16" cy="16" r="13" fill="#fff" stroke="#000" stroke-width="2"/><rect x="14" y="13" width="4" height="11" fill="#00f"/><rect x="14" y="7" width="4" height="4" fill="#00f"/>'),
  warn: svg('<path d="M16 3 L30 28 L2 28 Z" fill="#ff0" stroke="#000" stroke-width="2"/><rect x="14" y="11" width="4" height="10" fill="#000"/><rect x="14" y="23" width="4" height="3" fill="#000"/>'),
  stop: svg('<circle cx="16" cy="16" r="13" fill="#f00" stroke="#800000" stroke-width="2"/><path d="M10 10 L22 22 M22 10 L10 22" stroke="#fff" stroke-width="4"/>'),
  power: svg('<path d="M10 7 A11 11 0 1 0 22 7" fill="none" stroke="#800000" stroke-width="4"/><rect x="14" y="2" width="4" height="13" fill="#800000"/>'),
  pm: svg('<rect x="3" y="5" width="26" height="22" fill="#fff" stroke="#000"/><rect x="3" y="5" width="26" height="5" fill="#000080"/><rect x="7" y="14" width="5" height="5" fill="#008080"/><rect x="14" y="14" width="5" height="5" fill="#800000"/><rect x="21" y="14" width="5" height="5" fill="#808000"/>'),
  chat: svg('<path d="M2 4h19v12H9l-5 4v-4H2z" fill="#fff" stroke="#000"/><path d="M12 13h18v11h-2v4l-5-4H12z" fill="#ffe066" stroke="#000"/><g fill="#000080"><rect x="5" y="8" width="12" height="1"/><rect x="5" y="11" width="8" height="1"/></g><g fill="#800000"><rect x="15" y="17" width="12" height="1"/><rect x="15" y="20" width="9" height="1"/></g>'),
  im: svg('<circle cx="13" cy="15" r="10" fill="#ffd400" stroke="#000"/><rect x="9" y="11" width="2" height="3" fill="#000"/><rect x="15" y="11" width="2" height="3" fill="#000"/><path d="M8 17q5 5 10 0" fill="none" stroke="#000" stroke-width="1.5"/><path d="M20 2h11v8h-6l-3 3v-3h-2z" fill="#fff" stroke="#000"/><rect x="22" y="5" width="7" height="1" fill="#00c"/>'),
  jb: svg('<rect x="3" y="6" width="26" height="20" fill="#333" stroke="#000"/><rect x="5" y="8" width="22" height="7" fill="#000"/><g fill="#0f0"><rect x="7" y="12" width="2" height="2"/><rect x="10" y="10" width="2" height="4"/><rect x="13" y="11" width="2" height="3"/><rect x="16" y="9" width="2" height="5"/><rect x="19" y="11" width="2" height="3"/><rect x="22" y="12" width="2" height="2"/></g><circle cx="11" cy="21" r="3" fill="#888" stroke="#000"/><circle cx="21" cy="21" r="3" fill="#888" stroke="#000"/>'),
  start: svg('<rect x="6" y="2" width="12" height="3" fill="#ff5500"/><rect x="3" y="5" width="18" height="3" fill="#ff9900"/><rect x="1" y="8" width="22" height="3" fill="#ffdd00"/><rect x="0" y="12" width="24" height="2" fill="#000080"/><rect x="3" y="15" width="18" height="2" fill="#000080"/><rect x="7" y="18" width="10" height="2" fill="#000080"/>', '0 0 24 21'),
  tw: svg('<path d="M4 2h8v3l-3 3 3 3v3H4v-3l3-3-3-3z" fill="#ffe8a0" stroke="#000"/><path d="M5 12h6v1H5zM7 8h2v1H7z" fill="#a07000"/>', '0 0 16 16'),
  net: svg('<rect x="1" y="2" width="8" height="6" fill="#008080" stroke="#000"/><rect x="7" y="7" width="8" height="6" fill="#008080" stroke="#000"/><rect x="3" y="9" width="4" height="1" fill="#000"/><rect x="9" y="14" width="4" height="1" fill="#000"/>', '0 0 16 16'),
  shop: svg('<path d="M3 8h26l-3 14H6z" fill="#ffd84d" stroke="#000"/><path d="M9 8l4-5M23 8l-4-5" stroke="#000" stroke-width="2"/><rect x="8" y="12" width="3" height="7" fill="#c00"/><rect x="14" y="12" width="3" height="7" fill="#00a"/><rect x="20" y="12" width="3" height="7" fill="#080"/><circle cx="10" cy="26" r="2.5" fill="#000"/><circle cx="23" cy="26" r="2.5" fill="#000"/>'),
  pc: svg('<rect x="4" y="3" width="24" height="17" fill="#c0c0c0" stroke="#000"/><rect x="7" y="6" width="18" height="11" fill="#008080"/><rect x="11" y="20" width="10" height="3" fill="#808080"/><rect x="3" y="23" width="26" height="6" fill="#c0c0c0" stroke="#000"/><rect x="20" y="25" width="6" height="2" fill="#000"/>'),
  folder: svg('<path d="M2 8h11l3 3h14v17H2z" fill="#ffd84d" stroke="#000"/><path d="M2 13h28" stroke="#c9a200"/>'),
  group: svg('<rect x="3" y="9" width="26" height="16" fill="#c0c0c0" stroke="#000"/><rect x="3" y="9" width="26" height="4" fill="#000080"/><g fill="#fff" stroke="#000"><rect x="7" y="16" width="5" height="5"/><rect x="14" y="16" width="5" height="5"/><rect x="21" y="16" width="5" height="5"/></g>'),
  vol: svg('<path d="M2 6h3l4-3v10l-4-3H2z" fill="#ff0" stroke="#000"/><path d="M11 5q2 3 0 6M12.5 3.5q3.5 4.5 0 9" fill="none" stroke="#000"/>', '0 0 16 16')
};
const TB = {
  back: '<svg viewBox="0 0 20 20"><path d="M2 10l7-7v4h9v6H9v4z" fill="#2a2" stroke="#050"/></svg>',
  fwd: '<svg viewBox="0 0 20 20"><path d="M18 10l-7-7v4H2v6h9v4z" fill="#2a2" stroke="#050"/></svg>',
  stop: '<svg viewBox="0 0 20 20"><path d="M6 1h8l5 5v8l-5 5H6l-5-5V6z" fill="#d22" stroke="#600"/><path d="M6 6l8 8M14 6l-8 8" stroke="#fff" stroke-width="2"/></svg>',
  reload: '<svg viewBox="0 0 20 20"><path d="M16 9a6 6 0 1 1-2-4.5" fill="none" stroke="#06c" stroke-width="2.4"/><path d="M11 2h6v6z" fill="#06c"/></svg>',
  home: '<svg viewBox="0 0 20 20"><path d="M10 2l8 7h-2v9H4V9H2z" fill="#fc3" stroke="#630"/><rect x="8" y="12" width="4" height="6" fill="#930"/></svg>',
  search: '<svg viewBox="0 0 20 20"><circle cx="8" cy="8" r="5.5" fill="#cef" stroke="#036" stroke-width="2"/><path d="M12 12l6 6" stroke="#630" stroke-width="3"/></svg>'
};

/* ---------- stages ---------- */
const screen = $('#screen');
const TW_STAGES = ['st-bios', 'st-splash', 'st-bye'];
function show(id) {
  $$('.stage').forEach(s => s.classList.toggle('on', s.id === id));
  $('#tw-float').classList.toggle('on', TW_STAGES.includes(id));
  closeTW();
}
const stageOn = id => $('#' + id).classList.contains('on');
screen.classList.toggle('crt', !!settings.crt);
function applyWall() {
  const desk = $('#st-desk');
  const w = era.walls.find(x => x[0] === eraCfg().wall) || era.walls[0];
  desk.style.setProperty('--wall', w[1]);
  desk.style.background = w[1];
  desk.classList.toggle('weave', w[0] === 'weave');
}

/* ---------- window manager ---------- */
const layer = $('#layer');
const wins = {};
let zTop = 10, cascade = 0, tearing = false;
function focusWin(W) {
  Object.values(wins).forEach(o => o.el.classList.toggle('active', o === W));
  if (W) { W.el.style.zIndex = ++zTop; W.el.classList.remove('min'); W.minimized = false; }
  renderTasks();
}
function activeWin() { return Object.values(wins).find(o => o.el.classList.contains('active') && !o.minimized); }
function maximize(W, on) {
  W.max = on;
  if (on) {
    W.prev = { left: W.el.style.left, top: W.el.style.top, width: W.el.style.width, height: W.el.style.height };
    Object.assign(W.el.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
  } else if (W.prev) Object.assign(W.el.style, W.prev);
  W.el.querySelector('[data-a=max]').textContent = on ? '❐' : '□';
  W.onResize && W.onResize();
}
function closeWin(W) {
  if (W.onClose && W.onClose() === false) return;
  W.el.remove(); delete wins[W.id];
  const rest = Object.values(wins).filter(o => !o.minimized).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex);
  focusWin(rest[0] || null);
}
function closeAll() {
  tearing = true;
  Object.values(wins).forEach(W => { try { W.onClose && W.onClose(); } catch (e) {} W.el.remove(); delete wins[W.id]; });
  tearing = false;
  renderTasks();
}
function openWin(o) {
  if (wins[o.id]) { focusWin(wins[o.id]); return wins[o.id]; }
  sfx.seek(4);
  document.body.classList.add('wait'); setTimeout(() => document.body.classList.remove('wait'), 450);
  const el = document.createElement('div');
  el.className = 'win';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', o.title);
  el.innerHTML = `<div class="tb"><span class="ico">${ICONS[o.icon] || ''}</span><span class="t"></span>${o.noMin ? '' : '<button class="tbb" data-a="min" aria-label="Minimize">_</button>'}${o.fixed ? '' : '<button class="tbb" data-a="max" aria-label="Maximize">□</button>'}<button class="tbb x" data-a="close" aria-label="Close">×</button></div><div class="body"></div>${o.fixed ? '' : '<div class="grip" aria-hidden="true"></div>'}`;
  el.querySelector('.t').textContent = o.title;
  layer.appendChild(el);
  const W = { id: o.id, el, title: o.title, icon: o.icon, body: el.querySelector('.body'), modal: !!o.modal };
  // Not getBoundingClientRect: the power-on animation scales the screen. Fall back to the viewport if the desktop is not laid out yet.
  const L = { width: layer.clientWidth || innerWidth, height: layer.clientHeight || innerHeight - 34 };
  const narrow = L.width < 640;
  const w = Math.min(o.w || 420, L.width - 8), h = Math.min(o.h || 300, L.height - 8);
  let left, top;
  if (o.center) { left = (L.width - w) / 2; top = Math.max(4, (L.height - h) / 2.4); }
  else if (o.at) { left = Math.max(4, Math.min(o.at[0], L.width - w - 4)); top = Math.max(4, Math.min(o.at[1], L.height - h - 4)); }
  else if (o.id === 'pm') { left = 16; top = 16; }
  else {
    const base = L.width >= w + 500 ? (era.shell === 'start' ? 120 : 500) : 30;
    left = Math.min(base + cascade * 26, Math.max(4, L.width - w - 4)); top = Math.min(20 + cascade * 24, Math.max(4, L.height - h - 4)); cascade = (cascade + 1) % 7;
  }
  if (narrow && !o.at) left = Math.max(4, (L.width - w) / 2);
  Object.assign(el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: o.autoH ? 'auto' : h + 'px' });
  if (narrow && !o.fixed && !o.center && !o.at) setTimeout(() => maximize(W, true), 0);
  // drag
  const tb = el.querySelector('.tb');
  tb.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || W.max) return;
    const sx = e.clientX, sy = e.clientY, ol = el.offsetLeft, ot = el.offsetTop;
    tb.setPointerCapture(e.pointerId);
    const mv = ev => {
      const Lr = layer.getBoundingClientRect();
      el.style.left = Math.min(Math.max(ol + ev.clientX - sx, -el.offsetWidth + 60), Lr.width - 60) + 'px';
      el.style.top = Math.min(Math.max(ot + ev.clientY - sy, 0), Lr.height - 24) + 'px';
    };
    const up = () => { tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); tb.removeEventListener('pointercancel', up); };
    tb.addEventListener('pointermove', mv); tb.addEventListener('pointerup', up); tb.addEventListener('pointercancel', up);
  });
  if (!o.fixed) tb.addEventListener('dblclick', e => { if (!e.target.closest('button')) maximize(W, !W.max); });
  const grip = el.querySelector('.grip');
  if (grip) grip.addEventListener('pointerdown', e => {
    e.stopPropagation(); if (W.max) return;
    const sx = e.clientX, sy = e.clientY, ow = el.offsetWidth, oh = el.offsetHeight;
    grip.setPointerCapture(e.pointerId);
    const mv = ev => { el.style.width = Math.max(200, ow + ev.clientX - sx) + 'px'; el.style.height = Math.max(120, oh + ev.clientY - sy) + 'px'; W.onResize && W.onResize(); };
    const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); };
    grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
  });
  el.querySelectorAll('.tbb').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'close') closeWin(W);
    else if (a === 'max') maximize(W, !W.max);
    else if (a === 'min') { W.minimized = true; el.classList.add('min'); el.classList.remove('active'); W.onMin && W.onMin(); renderTasks(); }
  }));
  el.addEventListener('pointerdown', () => { if (activeWin() !== W) focusWin(W); }, true);
  wins[o.id] = W;
  o.build && o.build(W);
  focusWin(W);
  return W;
}
function renderTasks() {
  const list = $('#tasklist'); list.innerHTML = '';
  Object.values(wins).forEach(W => {
    if (W.modal) return;
    const b = document.createElement('button');
    b.className = 'btn task' + (W.el.classList.contains('active') && !W.minimized ? ' active' : '');
    b.innerHTML = (ICONS[W.icon] || '') + '<span></span>';
    b.querySelector('span').textContent = W.title;
    b.title = W.title;
    b.onclick = () => {
      if (W.el.classList.contains('active') && !W.minimized) { W.minimized = true; W.el.classList.add('min'); W.el.classList.remove('active'); W.onMin && W.onMin(); renderTasks(); }
      else focusWin(W);
    };
    list.appendChild(b);
  });
}
function setTitle(W, t) { W.title = t; W.el.querySelector('.t').textContent = t; renderTasks(); }

/* menus */
let openMenuEl = null;
function closeMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; $$('.mi.open').forEach(m => m.classList.remove('open')); } }
document.addEventListener('pointerdown', e => {
  if (openMenuEl && !e.target.closest('.menu') && !e.target.closest('.mi')) closeMenu();
  if (!e.target.closest('#startmenu') && !e.target.closest('#startsub') && !e.target.closest('#offbtn')) closeStart();
  if (!e.target.closest('#tw-panel') && !e.target.closest('.twb') && !e.target.closest('#tw-float')) closeTW();
});
function menubar(W, spec) {
  const bar = document.createElement('div'); bar.className = 'menubar';
  spec.forEach(m => {
    const b = document.createElement('button'); b.className = 'mi';
    b.innerHTML = `<u>${m.label[0]}</u>${m.label.slice(1)}`;
    b.onclick = e => {
      e.stopPropagation();
      const was = b.classList.contains('open'); closeMenu(); if (was) return;
      b.classList.add('open');
      const items = typeof m.items === 'function' ? m.items() : m.items;
      const menu = document.createElement('div'); menu.className = 'menu raised'; menu.setAttribute('role', 'menu');
      items.forEach(it => {
        if (it === '-') { menu.appendChild(document.createElement('hr')); return; }
        const ib = document.createElement('button'); ib.textContent = it.label; ib.setAttribute('role', 'menuitem');
        if (it.disabled) ib.disabled = true;
        ib.onclick = () => { closeMenu(); it.fn(); };
        menu.appendChild(ib);
      });
      const r = b.getBoundingClientRect(), S = screen.getBoundingClientRect();
      menu.style.left = Math.min(r.left - S.left, S.width - 190) + 'px';
      menu.style.top = (r.bottom - S.top) + 'px';
      screen.appendChild(menu); openMenuEl = menu;
      const first = menu.querySelector('button:not(:disabled)'); first && first.focus();
    };
    bar.appendChild(b);
  });
  W.el.insertBefore(bar, W.body);
}

/* message box */
let msgN = 0;
function msgBox(title, text, buttons = ['OK'], icon = 'info') {
  return new Promise(res => {
    const id = 'msg' + (++msgN);
    if (icon === 'stop' || icon === 'warn') sfx.ding(); else sfx.beep();
    openWin({ id, title, icon: null, w: 380, center: true, fixed: true, noMin: true, autoH: true, modal: true, build(W) {
      W.body.innerHTML = `<div class="dlg"><div class="row">${ICONS[icon]}<div class="msg"></div></div><div class="btns"></div></div>`;
      W.body.querySelector('.msg').textContent = text;
      const bx = W.body.querySelector('.btns');
      let answered = false;
      buttons.forEach((lab, i) => {
        const b = document.createElement('button'); b.className = 'btn'; b.textContent = lab;
        b.onclick = () => { answered = true; closeWin(W); res(lab); };
        bx.appendChild(b); if (i === 0) setTimeout(() => b.focus(), 30);
      });
      W.onClose = () => { if (!answered) res(null); };
      W.el.style.zIndex = 7000;
    }});
  });
}

/* ---------- keyboard + click sounds ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMenu(); closeStart(); closeTW(); }
  if (!stageOn('st-desk')) return;
  const W = activeWin();
  if (W && W.onKey) W.onKey(e);
});
$('#st-desk').addEventListener('pointerdown', () => sfx.click());

/* ---------- apps ---------- */
// Core apps built into the engine. cat: 'main' | 'acc' (accessories) | 'game'
const APP_DEFS = {
  dial: () => ({ label: era.modem.appLabel || 'Dial-Up Connection', icon: 'dial', cat: 'main', open: openDial }),
  nv: () => ({ label: era.browser.name, icon: 'web', cat: 'main', open: () => openBrowser() }),
  readme: () => ({ label: 'Read Me First', icon: 'note', cat: 'main', open: () => openNotepad('README.TXT') }),
  mines: () => ({ label: 'Mines', icon: 'mines', cat: 'game', open: openMines }),
  worm: () => ({ label: 'Worm', icon: 'worm', cat: 'game', open: openWorm }),
  paint: () => ({ label: 'Paintbox', icon: 'paint', cat: 'acc', open: openPaint }),
  np: () => ({ label: 'Notepad', icon: 'note', cat: 'acc', open: () => openNotepad('MYNOTES.TXT') }),
  cp: () => ({ label: 'Control Panel', icon: 'cp', cat: 'main', open: openSettings }),
  chat: () => ({ label: era.chat.label, icon: 'chat', cat: 'main', open: () => openChat(era.chat) }),
  im: () => ({ label: era.im.label, icon: 'im', cat: 'main', open: () => openChat(era.im) }),
  jb: () => ({ label: 'Jukebox', icon: 'jb', cat: 'acc', open: () => openJukebox() }),
  store: () => ({ label: 'Software Store', icon: 'shop', cat: 'main', open: () => openStore() }),
  files: () => ({ label: era.shell === 'start' ? 'My Computer' : 'File Manager', icon: 'pc', cat: 'main', open: () => openFiles() })
};

/* Plug-in programs live in js/apps/*.js and register on window.RETRO_APPS.
   kind 'builtin' ships with the listed eras; kind 'store' is bought in the
   Software Store and runs in its release year and every later year. */
const PLUGINS = {};
(window.RETRO_APPS || []).forEach(p => {
  if (!p || !p.id || PLUGINS[p.id] || APP_DEFS[p.id]) { console.warn('Skipping app', p && p.id); return; }
  PLUGINS[p.id] = p;
  if (p.icon) ICONS['app-' + p.id] = p.icon;
  if (p.css) { const st = document.createElement('style'); st.dataset.app = p.id; st.textContent = p.css; document.head.appendChild(st); }
});
const owned = () => store.get('owned', []);
const isOwned = id => owned().includes(id);
const pluginRuns = p => p.kind === 'store' ? (p.year || 1990) <= era.year && isOwned(p.id) : (p.eras || []).includes(era.id);
const pluginDef = p => ({ id: p.id, label: p.label, icon: 'app-' + p.id, cat: p.cat || (p.kind === 'store' ? 'game' : 'game'), bought: p.kind === 'store', open: () => launchApp(p.id) });
// Everything that runs in this year, in display order.
function apps() {
  const core = [...era.apps, 'store', 'files'].map(id => Object.assign({ id }, APP_DEFS[id]()));
  return core.concat(Object.values(PLUGINS).filter(pluginRuns).map(pluginDef));
}
const findApp = id => apps().find(a => a.id === id);
const openApp = id => { const a = findApp(id); if (a) a.open(); else if (PLUGINS[id]) launchApp(id); };

function appApi(p, W) {
  return {
    era: { id: era.id, year: era.year },
    sfx, tone, noise, midi, esc, sleep, pick, $, $$,
    get user() { return store.get('user', 'kidsurfer'); },
    load: (k, d) => store.get('app:' + p.id + ':' + k, d),
    save: (k, v) => store.set('app:' + p.id + ':' + k, v),
    msgBox, menubar: spec => menubar(W, spec),
    setTitle: t => setTitle(W, t), close: () => closeWin(W),
    playMusic: song => playMusic(song, p.id), stopMusic: () => stopMusic(p.id),
    earn: (amt, why) => earn(amt, why),
    online: () => net.connected, kbps: () => net.connected ? rateKB() : 0,
    openApp
  };
}
function launchApp(id) {
  const p = PLUGINS[id]; if (!p) return;
  if (!pluginRuns(p)) {
    if (p.kind === 'store' && !isOwned(id)) { openStore(id); return; }
    msgBox(p.label, `${p.label} needs ${p.year >= 2000 ? 'Horizon 2000' : p.year >= 1995 ? 'Horizon 95' : 'Horizon'} or newer. Use the Time Machine to go forward in time.`, ['OK'], 'warn');
    return;
  }
  const w = p.window || {};
  openWin({ id: 'app:' + id, title: p.label, icon: 'app-' + id, w: w.w || 520, h: w.h || 420, fixed: !!w.fixed, autoH: !!w.autoH, build(W) {
    try { p.open(W, appApi(p, W)); }
    catch (e) {
      console.error(e);
      W.body.innerHTML = `<div class="dlg"><div class="row">${ICONS.stop}<div class="msg">${esc(p.label)} has performed an illegal operation and will be shut down.\n\n${esc(e.message)}</div></div></div>`;
    }
    const own = W.onClose;
    W.onClose = () => { const r = own && own(); if (r === false && !tearing) return false; stopMusic(p.id); };
  }});
}

/* play money */
const WALLET_START = 60, ALLOWANCE = 10, DAILY_EARN_CAP = 60;
const wallet = () => store.get('wallet', WALLET_START);
const setWallet = v => store.set('wallet', Math.round(v * 100) / 100);
const money = v => '$' + Number(v).toFixed(2);
function earn(amt, why) {
  const day = new Date().toDateString(), log = store.get('earnLog', { day, n: 0 });
  if (log.day !== day) { log.day = day; log.n = 0; }
  const give = Math.max(0, Math.min(amt, DAILY_EARN_CAP - log.n));
  if (!give) return 0;
  log.n += give; store.set('earnLog', log); setWallet(wallet() + give);
  toast(`+${money(give)}${why ? ' for ' + why : ''}`);
  if (wins.store && wins.store.refresh) wins.store.refresh();
  return give;
}
function allowance() {
  const day = new Date().toDateString();
  if (store.get('allowanceDay', '') === day) return;
  const first = store.get('allowanceDay', '') === '';
  store.set('allowanceDay', day);
  if (!first) { setWallet(wallet() + ALLOWANCE); setTimeout(() => toast(`+${money(ALLOWANCE)} allowance. Spend it at the Software Store!`), 1500); }
}
let toastT = 0;
function toast(text) {
  const t = $('#toast'); if (!t) return;
  t.textContent = text; t.classList.add('on'); sfx.blip(990);
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

function iconButton(a, grid) {
  const b = document.createElement('button'); b.className = 'icon'; b.setAttribute('role', 'listitem');
  b.innerHTML = ICONS[a.icon] + '<span></span>'; b.querySelector('span').textContent = a.label;
  let lastType = 'mouse';
  b.addEventListener('pointerdown', e => { lastType = e.pointerType; $$('.icon.sel', grid).forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
  b.addEventListener('click', () => { if (lastType !== 'mouse') a.open(); });
  b.addEventListener('dblclick', () => a.open());
  b.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); a.open(); } });
  return b;
}
const GROUPS = { acc: 'Accessories', game: 'Games' };
const groupApps = cat => apps().filter(a => a.cat === cat);
// A folder or program-group window: a grid of icons that refreshes after a purchase.
function openFolder(cat) {
  const W = openWin({ id: 'fld:' + cat, title: GROUPS[cat], icon: cat === 'game' ? 'mines' : 'pm', w: 430, h: 300, build(W) {
    W.refresh = () => {
      W.body.innerHTML = '<div class="pm" role="list"></div>';
      const grid = W.body.firstChild;
      groupApps(cat).forEach(a => grid.appendChild(iconButton(a, grid)));
      if (cat === 'game') grid.appendChild(iconButton({ label: 'Get more games…', icon: 'shop', open: () => openStore() }, grid));
    };
    W.refresh();
  }});
  return W;
}
function refreshShell() {
  Object.values(wins).forEach(W => W.id.startsWith('fld:') && W.refresh && W.refresh());
  if (era.shell === 'start' && stageOn('st-desk')) buildStartMenu();
}

function openProgman() {
  openWin({ id: 'pm', title: 'Program Manager', icon: 'pm', w: 490, h: 300, build(W) {
    const main = () => apps().filter(a => a.cat === 'main');
    menubar(W, [
      { label: 'File', items: () => [
        ...main().slice(0, 3).map(a => ({ label: 'Open ' + a.label, fn: a.open })), '-',
        { label: 'Travel to another year…', fn: () => openTW() },
        { label: 'Shut Down…', fn: askShutdown }
      ]},
      { label: 'Options', items: () => [{ label: 'Control Panel', fn: openSettings }, { label: settings.crt ? 'Turn off CRT glow' : 'Turn on CRT glow', fn: toggleCrt }] },
      { label: 'Window', items: () => Object.keys(GROUPS).map(c => ({ label: GROUPS[c], fn: () => openFolder(c) })) },
      { label: 'Help', items: [{ label: 'Read Me First', fn: () => openNotepad('README.TXT') }, { label: 'About ' + era.os.name, fn: aboutOS }] }
    ]);
    W.body.innerHTML = '<div class="pm" role="list"></div>';
    const grid = W.body.firstChild;
    main().forEach(a => grid.appendChild(iconButton(a, grid)));
    Object.keys(GROUPS).forEach(c => grid.appendChild(iconButton({ label: GROUPS[c], icon: 'group', open: () => openFolder(c) }, grid)));
    W.onClose = () => { if (tearing) return; askShutdown(); return false; };
  }});
}
const aboutOS = () => msgBox('About ' + era.os.name, era.os.about);
function toggleCrt() { settings.crt = !settings.crt; screen.classList.toggle('crt', settings.crt); saveSettings(); }

/* Start-menu desktop (1995 and later) */
function buildStartShell() {
  const grid = document.createElement('div'); grid.id = 'deskicons'; grid.setAttribute('role', 'list');
  const desk = ['files', ...era.apps.filter(id => APP_DEFS[id]().cat === 'main' && id !== 'cp'), 'store'];
  desk.forEach(id => grid.appendChild(iconButton(findApp(id), grid)));
  grid.appendChild(iconButton({ label: 'Games', icon: 'folder', open: () => openFolder('game') }, grid));
  layer.prepend(grid);
  grid.addEventListener('pointerdown', e => { if (e.target === grid) $$('.icon.sel', grid).forEach(x => x.classList.remove('sel')); });
  $('#startmenu .side').innerHTML = era.os.startSide;
  buildStartMenu();
  const ql = $('#ql'); ql.innerHTML = '';
  (era.quickLaunch || []).forEach(id => {
    const d = APP_DEFS[id](); const b = document.createElement('button');
    b.innerHTML = ICONS[d.icon]; b.title = d.label; b.setAttribute('aria-label', d.label); b.onclick = d.open; ql.appendChild(b);
  });
}
function buildStartMenu() {
  const items = $('#startmenu .items'); items.innerHTML = '';
  const add = (icon, label, fn, sub) => {
    const b = document.createElement('button'); b.innerHTML = (ICONS[icon] || '') + '<span></span>' + (sub ? '<b class="arr">▸</b>' : '');
    b.querySelector('span').textContent = label;
    if (sub) { b.onclick = e => { e.stopPropagation(); openSub(b, sub()); }; b.onpointerenter = e => { if (e.pointerType === 'mouse') openSub(b, sub()); }; }
    else { b.onclick = () => { closeStart(); fn(); }; b.onpointerenter = () => closeSub(); }
    items.appendChild(b);
  };
  add('folder', 'Programs', null, () => apps().filter(a => a.cat !== 'game' && !['cp', 'readme'].includes(a.id)));
  add('mines', 'Games', null, () => groupApps('game').concat([{ label: 'Get more games…', icon: 'shop', open: () => openStore() }]));
  items.appendChild(document.createElement('hr'));
  add('cp', 'Control Panel', openSettings);
  add('note', 'Help: Read Me First', () => openNotepad('README.TXT'));
  add('info', 'About ' + era.os.name, aboutOS);
  add('tw', 'Travel to another year…', () => openTW());
  items.appendChild(document.createElement('hr'));
  add('power', 'Shut Down…', askShutdown);
}
function openSub(btn, list) {
  closeSub();
  const m = document.createElement('div'); m.id = 'startsub'; m.className = 'raised'; m.setAttribute('role', 'menu');
  list.forEach(a => {
    const b = document.createElement('button'); b.innerHTML = (ICONS[a.icon] || '') + '<span></span>'; b.querySelector('span').textContent = a.label;
    b.onclick = () => { closeStart(); a.open(); }; m.appendChild(b);
  });
  $('#st-desk').appendChild(m);
  const S = $('#st-desk').getBoundingClientRect(), r = btn.getBoundingClientRect(), sm = $('#startmenu').getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = sm.right - S.left - 3, top = r.top - S.top;
  if (left + mw > S.width) left = Math.max(0, S.width - mw);
  if (top + mh > S.height - 34) top = Math.max(0, S.height - 34 - mh);
  m.style.left = left + 'px'; m.style.top = top + 'px';
  const f = m.querySelector('button'); f && f.focus();
}
function closeSub() { const m = $('#startsub'); if (m) m.remove(); }
function toggleStart() {
  const sm = $('#startmenu'), on = !sm.classList.contains('on');
  sm.classList.toggle('on', on); $('#offbtn').classList.toggle('down', on);
  if (on) { sfx.click(); const f = sm.querySelector('button'); f && f.focus(); }
}
function closeStart() { closeSub(); $('#startmenu').classList.remove('on'); $('#offbtn').classList.remove('down'); }
function setupTaskbar() {
  const off = $('#offbtn');
  if (era.shell === 'start') {
    off.className = 'btn startb'; off.innerHTML = ICONS.start + 'Start'; off.title = 'Click here to begin';
    off.onclick = toggleStart;
  } else {
    off.className = 'btn off'; off.innerHTML = ICONS.power + 'Shut Down'; off.title = 'Shut down the computer';
    off.onclick = askShutdown;
  }
  $('#ql').hidden = !(era.quickLaunch && era.quickLaunch.length);
  $('#tw-task').innerHTML = ICONS.tw + '<span>' + era.year + '</span>';
  $('#tw-task').title = 'Time machine: switch to another year';
  $('#tray .neticon').innerHTML = ICONS.net;
  refreshTray();
}
function refreshTray() {
  const n = $('#tray .neticon');
  n.classList.toggle('on', net.connected && era.shell === 'start');
  n.title = net.connected ? 'Connected at ' + fmtBps(effBps()) : '';
}

/* --- notepad --- */
function openNotepad(name) {
  const custom = name === 'MYNOTES.TXT';
  openWin({ id: 'np:' + name, title: 'Notepad - ' + name, icon: 'note', w: 520, h: 400, build(W) {
    menubar(W, [
      { label: 'File', items: () => [
        ...Object.keys(era.files).map(f => ({ label: 'Open ' + f, fn: () => openNotepad(f), disabled: f !== 'README.TXT' && !estore.get('got:' + f, f === 'JOKES.TXT' && era.id === '1990' ? store.get('gotJokes', false) : false) })),
        { label: 'Open MYNOTES.TXT', fn: () => openNotepad('MYNOTES.TXT') }, '-',
        { label: 'Save', fn: save, disabled: !custom },
        { label: 'Exit', fn: () => closeWin(W) }
      ]},
      { label: 'Edit', items: [{ label: 'Insert time/date', fn: () => { const d = new Date(); ta.setRangeText(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' ' + (d.getMonth() + 1) + '/' + d.getDate() + '/' + (era.year >= 2000 ? era.year : String(era.year).slice(2)), ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); } }] }
    ]);
    W.body.innerHTML = '<div class="np"><textarea spellcheck="false" aria-label="Text"></textarea></div>';
    const ta = W.body.querySelector('textarea');
    ta.value = custom ? store.get('mynotes', 'Type anything here. Choose File, then Save, and it will still be here next time.\n\n') : era.files[name];
    function save() { store.set('mynotes', ta.value); sfx.seek(6); msgBox('Notepad', 'MYNOTES.TXT has been saved to drive C:.'); }
    ta.addEventListener('keydown', e => { if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') sfx.key(); if ((e.ctrlKey || e.metaKey) && e.key === 's' && custom) { e.preventDefault(); save(); } });
  }});
}

/* --- dial-up --- */
let dialW = null, call = null;
function openDial(autoConnect) {
  const M = era.modem;
  dialW = openWin({ id: 'dial', title: M.appLabel || 'Dial-Up Connection', icon: 'dial', w: 400, fixed: true, autoH: true, build(W) {
    W.body.innerHTML = `<div class="dial">
      <div class="art sunken">${ICONS.dial}<div class="dots"><i></i><i></i><i></i><i></i></div>${ICONS.web}</div>
      <div class="grid">
        <label for="du-user">User name:</label><input id="du-user" type="text" value="${esc(store.get('user', 'kidsurfer'))}" autocomplete="off">
        <label for="du-pass">Password:</label><input id="du-pass" type="password" value="hunter22">
        <label for="du-phone">Phone:</label><input id="du-phone" type="text" value="${esc(M.phone)}" inputmode="tel">
        <label for="du-bps">Connection:</label><select id="du-bps">${M.options.map(o => `<option value="${o.v}">${esc(o.label)}</option>`).join('')}</select>
      </div>
      <div class="status sunken" role="status">Not connected. Press Connect to reach ${esc(M.isp)}.</div>
      <div class="btns"><button class="btn" data-b="go">Connect</button><button class="btn" data-b="x">Close</button></div>
    </div>`;
    const box = W.body.firstChild, status = box.querySelector('.status'), go = box.querySelector('[data-b=go]');
    const sel = box.querySelector('#du-bps'), phone = box.querySelector('#du-phone');
    sel.value = String(eraCfg().bps);
    const syncPhone = () => { phone.disabled = conn().kind === 'dsl'; };
    sel.onchange = () => { eraCfg().bps = +sel.value; saveSettings(); syncPhone(); };
    syncPhone();
    box.querySelector('#du-user').onchange = e => store.set('user', e.target.value.slice(0, 20));
    function refresh() {
      box.classList.toggle('live', net.connected);
      sel.disabled = net.connected || !!call;
      go.textContent = net.connected ? 'Disconnect' : (call ? 'Cancel' : 'Connect');
      if (net.connected) status.textContent = conn().kind === 'dsl'
        ? `Connected to ${M.isp} by DSL at ${fmtBps(effBps())}. It's always on, and the phone still works!`
        : `Connected to ${M.isp} at ${fmtBps(effBps())}.${conn().note ? ' ' + conn().note : ''} The phone line is now busy.`;
    }
    W.refresh = refresh;
    go.onclick = async () => {
      if (net.connected) { hangUp(); status.textContent = conn().kind === 'dsl' ? 'Disconnected.' : 'Disconnected. The phone line is free again.'; refresh(); return; }
      if (call) { call.cancel(); call = null; box.classList.remove('busy'); status.textContent = 'Call cancelled.'; refresh(); return; }
      box.classList.add('busy');
      const onS = s => status.textContent = s;
      call = conn().kind === 'dsl' ? dslCall(onS) : modemCall(phone.value.replace(/[^0-9*#]/g, '') || M.phone.replace(/\D/g, ''), onS, conn().p);
      refresh();
      const ok = await call.done; call = null; box.classList.remove('busy');
      if (!ok) return;
      net.connected = true; net.since = Date.now();
      scheduleDrop();
      refresh(); refreshTray();
      sfx.tada();
      Object.values(wins).forEach(X => X.onNet && X.onNet());
      setTimeout(() => { if (!net.connected) return; const b = openBrowser(); b && b.nav && b.nav(era.sites.home); }, 900);
    };
    box.querySelector('[data-b=x]').onclick = () => closeWin(W);
    W.onClose = () => { dialW = null; };
    refresh();
    if (autoConnect === true && !net.connected) setTimeout(() => go.click(), 300);
  }});
  return dialW;
}
function hangUp() {
  net.connected = false; clearTimeout(net.dropTimer);
  noise(0.05, { f: 700, vol: 0.4, decay: 1 });
  dialW && dialW.refresh && dialW.refresh();
  refreshTray();
  Object.values(wins).forEach(W => W.onNet && W.onNet());
}
function scheduleDrop() {
  clearTimeout(net.dropTimer);
  if (net.dropped || conn().kind === 'dsl') return;
  net.dropTimer = setTimeout(async () => {
    if (!net.connected || !wins.nv) return;
    net.dropped = true;
    noise(0.8, { f: 1800, q: 0.5, vol: 0.4 }); dual(350, 440, 1.2, 0.8, master, 0.05);
    hangUp();
    const r = await msgBox('Connection Lost', era.modem.dropMsg, ['Dial Again', 'OK'], 'warn');
    if (r === 'Dial Again') openDial(true);
  }, 150000);
}

/* --- browser --- */
const visited = new Set();
const A = (url, text) => `<a href="#" data-go="${url}"${visited.has(url) ? ' class="v"' : ''}>${text}</a>`;
const APPLINK = (id, text) => `<a href="#" data-app="${id}">${text}</a>`;
const NEWGIF = `<svg class="blinky" width="34" height="16" viewBox="0 0 34 16" style="vertical-align:middle"><rect width="34" height="16" fill="#f00"/><text x="17" y="12" fill="#ff0" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial">NEW!</text></svg>`;
const CONSTRUCTION = `<svg class="img" data-kb="6" width="220" height="64" viewBox="0 0 110 32" shape-rendering="crispEdges"><rect width="110" height="32" fill="#ffd400"/><g fill="#000">${Array.from({ length: 16 }, (_, i) => `<polygon points="${i * 8 - 8},0 ${i * 8 - 4},0 ${i * 8 - 12},6 ${i * 8 - 16},6"/><polygon points="${i * 8 - 8},26 ${i * 8 - 4},26 ${i * 8 - 12},32 ${i * 8 - 16},32"/>`).join('')}</g><text x="55" y="15" font-size="7.5" font-weight="700" text-anchor="middle" font-family="Arial">UNDER</text><text x="55" y="23" font-size="7.5" font-weight="700" text-anchor="middle" font-family="Arial">CONSTRUCTION</text><g fill="#000"><circle cx="12" cy="12" r="2"/><rect x="11" y="14" width="2" height="6"/><rect x="13" y="15" width="6" height="1"/><rect x="18" y="12" width="1" height="10"/><rect x="16" y="21" width="5" height="2"/></g></svg>`;
const rateKB = () => effBps() / 8 / 1024 * 0.85;
function fmtTime(s) {
  s = Math.max(1, Math.round(s));
  if (s < 60) return s + ' sec';
  const m = Math.floor(s / 60); if (m < 60) return m + ' min ' + (s % 60) + ' sec';
  return Math.floor(m / 60) + ' hr ' + (m % 60) + ' min';
}
const fmtKB = kb => kb >= 1000 ? (kb / 1000).toFixed(1) + ' MB' : kb + ' KB';
function dlTable(files) {
  return `<table border="1" cellpadding="6"><tr><th>File</th><th>Size</th><th>Time at your speed (${fmtBps(effBps())})</th><th></th></tr>` +
    files.map(([n, kb, d]) => `<tr><td><b>${n}</b><br><small>${d}</small></td><td>${fmtKB(kb)}</td><td>${fmtTime(kb / rateKB())}</td><td><button class="btn" data-dl="${n}" data-kb="${kb}">Download</button></td></tr>`).join('') + `</table>`;
}
const bindDownloads = root => $$('[data-dl]', root).forEach(b => b.onclick = () => openDownload(b.dataset.dl, +b.dataset.kb));
const gb = {
  list: defaults => estore.get('guestbook', defaults),
  html: list => list.map(e => `<div class="gb-entry" style="color:#000"><b>${esc(e.n)}</b> from ${esc(e.w)} wrote:<br>${esc(e.m)}</div>`).join(''),
  form: (style = '') => `<form class="gb-form" data-sign style="color:#000;${style}"><label>Your name <input name="n" type="text" maxlength="30" required></label><label>Where are you from? <input name="w" type="text" maxlength="30"></label><label>Message <textarea name="m" rows="3" maxlength="200" required></textarea></label><button class="btn" type="submit">Sign it!</button></form>`,
  bind(root, nv, url, defaults) {
    root.querySelector('[data-sign]').onsubmit = e => {
      e.preventDefault(); const f = e.target;
      const list = gb.list(defaults); list.push({ n: f.n.value.trim(), w: f.w.value.trim() || 'The Internet', m: f.m.value.trim() });
      estore.set('guestbook', list.slice(-40)); nv.nav(url, 'reload');
    };
  }
};
// Everything an era's page() function may use.
const H = { A, APP: APPLINK, esc, store: estore, NEWGIF, CONSTRUCTION, rateKB, fmtTime, fmtBps, effBps, dlTable, bindDownloads, gb, playMusic, stopMusic, msgBox, openApp, get sites() { return era.sites; }, get user() { return store.get('user', 'kidsurfer'); }, conn };

let music = null;
function playMusic(song, owner = 'web') {
  stopMusic();
  const a = audio(); if (!a) return null;
  const bus = a.createGain(); bus.gain.value = song.gain ?? 0.6; bus.connect(master);
  const an = a.createAnalyser(); an.fftSize = 64; bus.connect(an);
  const mel = song.mel, bass = song.bass, len = mel.length, step = song.step;
  let n = 0, t = a.currentTime + 0.1;
  const sched = () => {
    // Background tabs run timers about once a second, so queue 1.5s ahead,
    // and skip (rather than cram in) any notes missed during a longer stall.
    if (t < a.currentTime) { const skip = Math.ceil((a.currentTime - t) / step); n += skip; t += skip * step; }
    while (t < a.currentTime + 1.5) {
      const i = n % len, rel = t - a.currentTime;
      if (mel[i]) tone(midi(mel[i]), step * (song.hold || 0.85), { type: song.lead || 'square', vol: song.leadVol || 0.03, dest: bus, at: rel });
      if (song.harm && mel[i]) tone(midi(mel[i] - 12 + song.harm), step * 0.8, { type: 'triangle', vol: 0.015, dest: bus, at: rel });
      if (i % 4 === 0) tone(midi(bass[(n / 4 | 0) % bass.length]), step * 3.6, { type: song.bassType || 'triangle', vol: song.bassVol || 0.09, dest: bus, at: rel });
      if (song.drums === 'four') {
        if (i % 2 === 0) tone(130, 0.14, { to: 42, type: 'sine', vol: 0.3, decay: 1, dest: bus, at: rel });
        if (i % 4 === 2) noise(0.12, { at: rel, ft: 'bandpass', f: 1800, q: 0.6, vol: 0.12, decay: 1, dest: bus });
        noise(0.03, { at: rel + step / 2, ft: 'highpass', f: 7000, vol: 0.05, decay: 1, dest: bus });
      } else if (i % 2 === 1) noise(0.03, { at: rel, ft: 'highpass', f: 6000, vol: 0.05, decay: 1, dest: bus });
      t += step; n++;
    }
  };
  sched();
  const id = setInterval(sched, 150);
  music = { owner, an, stop() { clearInterval(id); try { bus.disconnect(); } catch (e) {} } };
  return music;
}
function stopMusic(owner) { if (music && (!owner || music.owner === owner)) { music.stop(); music = null; } }

function openBrowser() {
  const B = era.browser;
  const W = openWin({ id: 'nv', title: B.name, icon: 'web', w: B.w || 640, h: B.h || 470, build(W) {
    menubar(W, [
      { label: 'File', items: [{ label: 'Open ' + (era.modem.appLabel || 'Dial-Up Connection'), fn: openDial }, { label: 'Close', fn: () => closeWin(W) }] },
      { label: B.menu || 'Go', items: () => [
        { label: 'Back', fn: back, disabled: hi < 1 }, ...(B.fwd ? [{ label: 'Forward', fn: fwd, disabled: hi >= hist.length - 1 }] : []), { label: 'Home', fn: () => nav(era.sites.home) }, '-',
        ...B.bookmarks.map(([l, u]) => ({ label: l, fn: () => nav(u) }))
      ]},
      { label: 'Help', items: [{ label: 'About ' + B.name, fn: () => msgBox('About ' + B.name, B.about) }] }
    ]);
    const btn = (k, label) => B.style === 'text'
      ? `<button class="btn" data-b="${k}">${label}</button>`
      : `<button class="btn ib" data-b="${k}">${TB[k]}<span>${label}</span></button>`;
    W.body.innerHTML = `<div class="nv">
      <div class="bar">${btn('back', 'Back')}${B.fwd ? btn('fwd', 'Forward') : ''}${B.style === 'text' ? btn('home', 'Home') + btn('reload', 'Reload') + btn('stop', 'Stop') : btn('stop', 'Stop') + btn('reload', B.reload || 'Reload') + btn('home', 'Home') + btn('search', 'Search')}
        <div class="throb" aria-hidden="true"><svg viewBox="0 0 26 26"><g class="spin"><circle cx="13" cy="13" r="10" fill="#0050c8"/><ellipse cx="13" cy="13" rx="4" ry="10" fill="none" stroke="#9cf"/><line x1="3" y1="13" x2="23" y2="13" stroke="#9cf"/></g></svg></div></div>
      <div class="loc"><label for="nv-loc">${B.locLabel || 'Location:'}</label><input id="nv-loc" type="text" spellcheck="false" autocomplete="off">${B.go ? '<button class="btn" data-b="go">Go</button>' : ''}</div>
      ${B.links ? `<div class="links">Links: ${B.links.map(([l, u]) => `<button data-go="${u}">${esc(l)}</button>`).join('')}</div>` : ''}
      <div class="page sunken" tabindex="0"></div>
      <div class="status"><div class="txt sunken" role="status">Document: Done</div><div class="pb sunken"><div class="fill"></div></div></div>
    </div>`;
    const box = W.body.firstChild, pg = box.querySelector('.page'), loc = box.querySelector('#nv-loc'), st = box.querySelector('.status .txt'), fill = box.querySelector('.pb .fill'), stopB = box.querySelector('[data-b=stop]');
    let hist = [], hi = -1, token = 0;
    const syncBtns = () => {
      if (B.style === 'text') return;
      box.querySelector('[data-b=back]').disabled = hi < 1;
      const f = box.querySelector('[data-b=fwd]'); if (f) f.disabled = hi >= hist.length - 1;
    };
    function back() { if (hi > 0) { hi--; nav(hist[hi], 'move'); } }
    function fwd() { if (hi < hist.length - 1) { hi++; nav(hist[hi], 'move'); } }
    async function nav(url, mode = 'push') {
      const my = ++token;
      stopMusic('web');
      loc.value = url;
      if (mode === 'push' && hist[hi] !== url) { hist = hist.slice(0, hi + 1); hist.push(url); hi++; }
      syncBtns();
      if (!net.connected) {
        box.classList.remove('loading'); stopB.disabled = true;
        pg.innerHTML = `<div class="web"><h1>No connection</h1><p>${esc(B.name)} can't reach <tt>${esc(url)}</tt> because this computer isn't connected to the Internet.</p><p>${esc(era.browser.offline)}</p><p><button class="btn" data-dial>Open ${esc(era.modem.appLabel || 'Dial-Up Connection')}</button></p></div>`;
        pg.querySelector('[data-dial]').onclick = () => openDial(true);
        st.textContent = 'Not connected'; fill.style.width = '0'; setTitle(W, B.name);
        return;
      }
      box.classList.add('loading'); stopB.disabled = false; document.body.classList.add('wait');
      const host = url.replace(/^https?:\/\//, '').split('/')[0];
      const lat = conn().lat || 1;
      st.textContent = `Looking up host: ${host}…`; fill.style.width = '0';
      await sleep((600 + Math.random() * 500) * lat); if (my !== token) return;
      st.textContent = `Contacting host: ${host}…`;
      await sleep((700 + Math.random() * 700) * lat); if (my !== token) return;
      st.textContent = 'Host contacted. Waiting for reply…';
      await sleep((500 + Math.random() * 600) * lat); if (my !== token) return;
      document.body.classList.remove('wait');
      visited.add(url);
      const P = era.page(url, H);
      setTitle(W, B.name + ' - [' + P.title + ']');
      pg.scrollTop = 0;
      pg.innerHTML = `<div class="web ${P.cls}">${P.blocks.map(b => `<div class="blk">${b}</div>`).join('')}</div>`;
      const root = pg.firstChild;
      const blks = $$('.blk', root);
      const sizes = blks.map(b => b.innerHTML.length / 1024 * 0.9 + $$('.img', b).reduce((s, i) => s + (+i.dataset.kb || 4), 0));
      const total = sizes.reduce((a, b) => a + b, 0);
      let got = 0;
      P.after && P.after(root, W);
      if (P.music) playMusic(P.music, 'web');
      for (let i = 0; i < blks.length; i++) {
        if (my !== token) return;
        blks[i].classList.add('on');
        const imgs = $$('.img', blks[i]);
        const secs = Math.min(sizes[i] / rateKB(), 7);
        imgs.forEach(im => { im.classList.add('loading'); im.style.animationDuration = Math.max(secs, 0.15) + 's'; });
        const t0 = performance.now();
        while (performance.now() - t0 < secs * 1000) {
          if (my !== token) return;
          const frac = (performance.now() - t0) / (secs * 1000);
          const cur = got + sizes[i] * Math.min(frac, 1);
          st.textContent = `Transferring data: ${cur.toFixed(1)} KB of ${total.toFixed(1)} KB (${rateKB().toFixed(1)} KB/sec)`;
          fill.style.width = (cur / total * 100) + '%';
          await sleep(Math.min(120, Math.max(16, secs * 1000 / 4)));
        }
        got += sizes[i];
      }
      if (my !== token) return;
      box.classList.remove('loading'); stopB.disabled = true;
      fill.style.width = '100%'; st.textContent = 'Document: Done';
      setTimeout(() => { if (my === token) fill.style.width = '0'; }, 1200);
      if (P.popup) maybePopup();
    }
    function stop() {
      token++; box.classList.remove('loading'); stopB.disabled = true; document.body.classList.remove('wait');
      $$('.img.loading', pg).forEach(i => i.style.animationPlayState = 'paused');
      st.textContent = 'Transfer interrupted!';
    }
    W.nav = nav;
    const go = e => {
      const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); nav(a.dataset.go); return; }
      const ap = e.target.closest('[data-app]'); if (ap) { e.preventDefault(); openApp(ap.dataset.app); }
    };
    pg.addEventListener('click', go);
    const links = box.querySelector('.links'); if (links) links.addEventListener('click', go);
    box.querySelector('[data-b=back]').onclick = back;
    const fb = box.querySelector('[data-b=fwd]'); if (fb) fb.onclick = fwd;
    box.querySelector('[data-b=home]').onclick = () => nav(era.sites.home);
    box.querySelector('[data-b=reload]').onclick = () => hi >= 0 && nav(hist[hi], 'reload');
    const sb = box.querySelector('[data-b=search]'); if (sb) sb.onclick = () => nav(era.sites.finder);
    stopB.onclick = stop;
    const typed = () => {
      let u = loc.value.trim(); if (!u) return;
      if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
      if (!/\/$/.test(u) && !/\.[a-z]+$/i.test(u.split('/').pop())) u += '/';
      nav(u.toLowerCase());
    };
    loc.addEventListener('keydown', e => { if (e.key === 'Enter') typed(); });
    const gob = box.querySelector('[data-b=go]'); if (gob) gob.onclick = typed;
    W.onClose = () => { token++; stopMusic('web'); document.body.classList.remove('wait'); };
    W.onMin = () => stopMusic('web');
    W.onNet = () => { if (!net.connected) { stop(); stopMusic('web'); st.textContent = 'Connection lost'; } };
    syncBtns();
    setTimeout(() => nav(era.sites.home), 50);
  }});
  return W;
}

/* pop-up ads (2000) */
let popN = 0;
function maybePopup() {
  if (!era.popups || Math.random() > 0.65) return;
  if (Object.keys(wins).filter(k => k.startsWith('pop')).length >= 2) return;
  setTimeout(() => {
    if (!wins.nv || !net.connected) return;
    const ad = pick(era.popups), L = { width: layer.clientWidth, height: layer.clientHeight };
    sfx.ding();
    openWin({ id: 'pop' + (++popN), title: ad.title, icon: 'warn', w: 300, h: 210, fixed: true, noMin: true,
      at: [Math.random() * Math.max(10, L.width - 320), Math.random() * Math.max(10, L.height - 240)], build(W) {
        W.body.innerHTML = `<div class="popad">${ad.html}<div><button class="btn" data-claim>${esc(ad.cta)}</button> <button class="btn" data-x>No thanks</button></div></div>`;
        W.body.querySelector('[data-claim]').onclick = () => { closeWin(W); msgBox(ad.title, ad.after, ['OK'], 'info'); };
        W.body.querySelector('[data-x]').onclick = () => closeWin(W);
      } });
  }, 900 + Math.random() * 1500);
}

/* --- downloads --- */
let dlN = 0;
function openDownload(name, kb) {
  if (!net.connected) { msgBox(era.browser.name, 'You need to be connected to download files.', ['OK'], 'warn'); return; }
  openWin({ id: 'dl' + (++dlN), title: 'Saving ' + name, icon: 'dl', w: 380, fixed: true, autoH: true, build(W) {
    W.body.innerHTML = `<div class="dl">
      <div class="fly">${ICONS.web.replace('<svg', '<svg class="f"')}<div class="paper"></div>${ICONS.dl.replace('<svg', '<svg class="f"')}</div>
      <div>Saving: <b>${esc(name)}</b> to C:\\DOWNLOAD</div>
      <div class="pb sunken"><div class="fill"></div></div>
      <div data-info role="status"></div>
      <div class="btns"><button class="btn" data-turbo>Skip ahead (no fair)</button><button class="btn" data-x>Cancel</button></div>
    </div>`;
    const info = W.body.querySelector('[data-info]'), fill = W.body.querySelector('.fill'), fly = W.body.querySelector('.fly');
    fly.style.setProperty('--span', Math.max(80, fly.clientWidth - 110) + 'px');
    let got = 0, turbo = 1, alive = true;
    const t = setInterval(() => {
      if (!net.connected) { clearInterval(t); info.textContent = 'Download failed: the connection was lost. You have to start over from the beginning.'; W.body.querySelector('.paper').style.display = 'none'; return; }
      got = Math.min(kb, got + rateKB() * 0.25 * turbo);
      fill.style.width = (got / kb * 100) + '%';
      info.textContent = `${got.toFixed(0)} KB of ${kb} KB copied. Time left: ${fmtTime((kb - got) / rateKB())} at ${rateKB().toFixed(1)} KB/sec`;
      if (got >= kb) {
        clearInterval(t); if (!alive) return; sfx.tada(); closeWin(W);
        downloaded(name, kb);
      }
    }, 250);
    W.body.querySelector('[data-turbo]').onclick = e => { turbo = 60; e.target.disabled = true; };
    W.body.querySelector('[data-x]').onclick = () => closeWin(W);
    W.onClose = () => { alive = false; clearInterval(t); };
  }});
}
async function downloaded(name, kb) {
  estore.set('downloads', [...estore.get('downloads', []).filter(d => d.n !== name), { n: name, kb }]);
  if (wins.files && wins.files.refresh) wins.files.refresh();
  if (era.files[name]) { estore.set('got:' + name, true); if (name === 'JOKES.TXT' && era.id === '1990') store.set('gotJokes', true); openNotepad(name); return; }
  const song = (era.songs || []).find(s => s.locked === name);
  if (song && era.apps.includes('jb')) {
    estore.set('got:' + name, true);
    const r = await msgBox('Download Complete', `${name} is saved to C:\\DOWNLOAD.\n\nOpen it in Jukebox to listen.`, ['Play it now', 'OK']);
    if (r === 'Play it now') openJukebox(song);
    return;
  }
  msgBox('Download Complete', `${name} is saved to C:\\DOWNLOAD.\n\n${era.dlDone}`);
}

/* --- software store --- */
const STORE_INFO = {
  '1990': { name: 'Cardinal Software Catalog', sub: 'Mail-order software, shipped to your door on 3½" floppy disks.' },
  '1995': { name: 'CompuMart CD-ROM Superstore', sub: 'Hundreds of titles on CD-ROM. Multimedia! Sound! Up to 650 MB!' },
  '2000': { name: 'Download Depot Store', sub: 'Download it now, or get the CD if your modem is slow.' }
};
const storeInfo = () => STORE_INFO[era.id] || STORE_INFO['2000'];
const reqOS = y => y >= 2000 ? 'Horizon 2000' : y >= 1995 ? 'Horizon 95' : 'Horizon 3.0';
function boxArt(p) {
  const b = p.box || {};
  return `<div class="box3d" style="--bx:${b.bg || '#223'};--fg:${b.fg || '#fff'};--ac:${b.accent || '#fc0'}"><div class="bx-top">${esc(p.publisher || 'Horizon Games')}</div><div class="bx-ico">${p.icon || ''}</div><div class="bx-title">${esc(p.label)}</div><div class="bx-tag">${esc(p.tagline || '')}</div><div class="bx-foot">${p.year}</div></div>`;
}
function openStore(focusId) {
  const W = openWin({ id: 'store', title: 'Software Store', icon: 'shop', w: 680, h: 500, build(W) {
    W.refresh = () => {
      const all = Object.values(PLUGINS).filter(p => p.kind === 'store').sort((a, b) => a.year - b.year || a.label.localeCompare(b.label));
      const now = all.filter(p => p.year <= era.year), later = all.filter(p => p.year > era.year);
      const S = storeInfo();
      W.body.innerHTML = `<div class="shop"><div class="shop-hd"><div><b>${esc(S.name)}</b><small>${esc(S.sub)}</small></div><div class="shop-wallet">Your money<b>${money(wallet())}</b><small>Win games and get a ${money(ALLOWANCE)} allowance every day you visit</small></div></div>
        <div class="shop-list">${now.map(p => {
          const own = isOwned(p.id), paid = store.get('pending', []).includes(p.id);
          const act = own ? `<span class="own">✔ Installed</span><button class="btn" data-play>Play</button>` : paid ? `<span class="own">Paid</span><button class="btn" data-inst>Install</button>` : `<span class="price">${money(p.price)}</span><button class="btn" data-buy>Buy</button>`;
          return `<div class="shop-item${p.id === focusId ? ' hi' : ''}" data-id="${p.id}">${boxArt(p)}<div class="shop-txt"><b>${esc(p.label)}</b><small>${esc(p.publisher || '')} · ${p.year} · ${esc(p.genre || 'Game')}</small><p>${esc(p.blurb || '')}</p><div class="shop-buy">${act}</div></div></div>`;
        }).join('') || '<p>No titles yet. Check back soon!</p>'}</div>
        ${later.length ? `<div class="shop-later"><b>Coming in the future:</b> ${later.map(p => `${esc(p.label)} <small>(needs ${reqOS(p.year)})</small>`).join(', ')}</div>` : ''}</div>`;
      $$('[data-buy]', W.body).forEach(b => b.onclick = () => buy(b.closest('[data-id]').dataset.id));
      $$('[data-play]', W.body).forEach(b => b.onclick = () => launchApp(b.closest('[data-id]').dataset.id));
      $$('[data-inst]', W.body).forEach(b => b.onclick = () => install(PLUGINS[b.closest('[data-id]').dataset.id]));
      const hi = W.body.querySelector('.shop-item.hi'); if (hi) hi.scrollIntoView({ block: 'nearest' });
    };
    W.refresh();
  }});
  if (focusId && W.refresh) W.refresh();
  return W;
}
async function buy(id) {
  const p = PLUGINS[id]; if (!p || isOwned(id)) return;
  if (wallet() < p.price) {
    msgBox('Not enough money', `${p.label} costs ${money(p.price)}, and you have ${money(wallet())}.\n\nWin some of the free games (Mines, Worm, the card games) to earn more, or come back tomorrow for your allowance.`, ['OK'], 'warn');
    return;
  }
  const r = await msgBox('Confirm purchase', `Buy ${p.label} for ${money(p.price)}?\n\nYou'll have ${money(wallet() - p.price)} left.`, ['Buy it', 'Cancel'], 'info');
  if (r !== 'Buy it') return;
  setWallet(wallet() - p.price);
  store.set('pending', [...new Set([...store.get('pending', []), p.id])]);
  if (wins.store && wins.store.refresh) wins.store.refresh();
  install(p);
}
function install(p) {
  const media = era.id === '1990' ? 'floppy' : era.id === '1995' || !net.connected ? 'cd' : 'download';
  const kb = p.sizeKB || 1400;
  openWin({ id: 'inst:' + p.id, title: 'Setup - ' + p.label, icon: 'dl', w: 400, fixed: true, noMin: true, autoH: true, build(W) {
    W.body.innerHTML = `<div class="dl"><div class="inst-top">${media === 'download' ? ICONS.web : ICONS.dl}<div><b>${esc(p.label)} Setup</b><br><small data-what></small></div></div><div class="pb sunken"><div class="fill"></div></div><div data-info role="status"></div><div class="btns"><button class="btn" data-turbo hidden>Skip ahead (no fair)</button></div></div>`;
    const what = W.body.querySelector('[data-what]'), info = W.body.querySelector('[data-info]'), fillEl = W.body.querySelector('.fill'), turboB = W.body.querySelector('[data-turbo]');
    let alive = true, turbo = 1;
    W.onClose = () => { if (!tearing && alive) return false; alive = false; };
    turboB.onclick = () => { turbo = 20; turboB.disabled = true; };
    const run = async (secs, label, from, to) => {
      const t0 = performance.now();
      while (alive) {
        const f = Math.min(1, (performance.now() - t0) * turbo / (secs * 1000));
        fillEl.style.width = (from + (to - from) * f) + '%'; info.textContent = label(f);
        if (f >= 1) break;
        if (media === 'download' && !net.connected) return false;
        await sleep(100);
      }
      return alive;
    };
    (async () => {
      let ok = true;
      if (media === 'floppy') {
        const n = Math.max(1, Math.min(4, Math.ceil(kb / 1440)));
        what.textContent = `${n} floppy disk${n > 1 ? 's' : ''}, 3½" high density`;
        for (let i = 1; i <= n && ok; i++) {
          if (i > 1) { const r = await msgBox('Setup', `Please insert Disk ${i} of ${n} into drive A: and press OK.`, ['OK']); if (r === null || !alive) { ok = false; break; } }
          sfx.floppy();
          ok = await run(2.6, () => `Copying files from Disk ${i} of ${n}…`, (i - 1) / n * 100, i / n * 100);
        }
      } else if (media === 'cd') {
        what.textContent = 'CD-ROM · ' + fmtKB(kb); sfx.cdrom();
        ok = await run(4.5, f => { if (Math.random() < 0.15) sfx.seek(2); return `Installing from CD-ROM… ${Math.round(f * 100)}%`; }, 0, 100);
      } else {
        const secs = Math.min(kb / rateKB(), 30);
        what.textContent = `Download · ${fmtKB(kb)} at ${fmtBps(effBps())}`; turboB.hidden = secs < 6;
        ok = await run(secs, f => `Downloading… ${Math.round(kb * f)} KB of ${kb} KB`, 0, 100);
        if (!ok && alive) { alive = false; closeWin(W); msgBox('Setup', 'The download failed because the connection was lost. Your purchase is saved. Open the Software Store and press Install to try again.', ['OK'], 'warn'); store.set('pending', [...new Set([...store.get('pending', []), p.id])]); return; }
      }
      if (!ok || !alive) { if (alive) { alive = false; closeWin(W); } store.set('pending', [...new Set([...store.get('pending', []), p.id])]); return; }
      store.set('owned', [...new Set([...owned(), p.id])]);
      store.set('pending', store.get('pending', []).filter(x => x !== p.id));
      alive = false; closeWin(W); sfx.tada(); refreshShell();
      if (wins.store && wins.store.refresh) wins.store.refresh();
      const r = await msgBox('Setup complete', `${p.label} is installed. You'll find it in Games.`, ['Play now', 'OK']);
      if (r === 'Play now') launchApp(p.id);
    })();
  }});
}

/* --- My Computer / File Manager --- */
const DISK = { '1990': 80, '1995': 850, '2000': 20480 };
function openFiles() {
  let path = 'C:\\';
  const title = era.shell === 'start' ? 'My Computer' : 'File Manager';
  openWin({ id: 'files', title, icon: 'pc', w: 480, h: 340, build(W) {
    const entries = () => {
      if (path === 'C:\\') {
        const docs = ['README.TXT', 'MYNOTES.TXT', ...Object.keys(era.files).filter(f => f !== 'README.TXT' && estore.get('got:' + f, false))];
        return [{ n: 'DOWNLOAD', dir: true }, { n: 'GAMES', dir: true }, ...docs.map(n => ({ n, kb: n === 'MYNOTES.TXT' ? Math.ceil(store.get('mynotes', '').length / 1024) || 1 : Math.ceil((era.files[n] || '').length / 1024), open: () => openNotepad(n), ico: 'note' }))];
      }
      if (path === 'C:\\GAMES') return groupApps('game').map(a => ({ n: a.label, ico: a.icon, open: a.open, kb: (PLUGINS[a.id] && PLUGINS[a.id].sizeKB) || 64 }));
      return estore.get('downloads', []).map(d => ({ n: d.n, kb: d.kb, ico: 'dl', open: () => era.files[d.n] ? openNotepad(d.n) : (era.songs || []).some(s => s.locked === d.n) && era.apps.includes('jb') ? openJukebox() : msgBox(title, `${d.n}\n\nThis file is just pretend, but it took real (pretend) time to download.`) }));
    };
    const render = () => {
      const list = entries(), used = list.reduce((s, e) => s + (e.kb || 0), 0) / 1024;
      W.body.innerHTML = `<div class="fmg"><div class="fm-bar"><button class="btn" data-up ${path === 'C:\\' ? 'disabled' : ''}>Up</button><span class="sunken">${esc(path)}</span></div><div class="fm-list sunken" role="list"></div><div class="fm-st">${list.length} object(s) · Drive C: ${DISK[era.id] >= 1024 ? DISK[era.id] / 1024 + ' GB' : DISK[era.id] + ' MB'}, ${((DISK[era.id] * (era.id === '1990' ? 0.3 : 0.4)) - used).toFixed(1)} MB free</div></div>`;
      const box = W.body.querySelector('.fm-list');
      if (!list.length) box.innerHTML = `<p class="fm-empty">${path.endsWith('DOWNLOAD') ? 'Nothing downloaded yet. Try the Web!' : 'Empty.'}</p>`;
      list.forEach(e => box.appendChild(iconButton({ label: e.n, icon: e.dir ? 'folder' : (e.ico || 'note'), open: e.dir ? () => { path = 'C:\\' + e.n; render(); } : e.open }, box)));
      W.body.querySelector('[data-up]').onclick = () => { path = 'C:\\'; render(); };
    };
    W.refresh = render; render();
  }});
}

/* --- backup code (move your computer to another browser, no login) --- */
function allSaved() {
  const out = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('r1990:')) out[k] = localStorage.getItem(k); } } catch (e) {}
  return out;
}
function openBackup() {
  openWin({ id: 'backup', title: 'Backup & Restore', icon: 'cp', w: 440, fixed: true, autoH: true, build(W) {
    let code = '';
    try { code = btoa(unescape(encodeURIComponent(JSON.stringify(allSaved())))); } catch (e) {}
    W.body.innerHTML = `<div class="cp"><p style="margin:0">Your games, money, notes and scores are saved in this browser automatically. To move them to another computer or browser, copy this backup code and paste it there.</p>
      <textarea rows="5" readonly data-code style="width:100%;font:11px monospace;word-break:break-all"></textarea>
      <div class="btns" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-copy>Copy code</button></div>
      <fieldset><legend>Restore from a code</legend><textarea rows="3" data-in style="width:100%;font:11px monospace" placeholder="Paste a backup code here"></textarea><button class="btn" data-restore>Restore</button></fieldset>
      <div style="text-align:right"><button class="btn" data-ok>Close</button></div></div>`;
    const ta = W.body.querySelector('[data-code]'); ta.value = code;
    W.body.querySelector('[data-copy]').onclick = async e => { ta.select(); try { await navigator.clipboard.writeText(code); e.target.textContent = 'Copied!'; } catch (err) { document.execCommand && document.execCommand('copy'); e.target.textContent = 'Selected, press Ctrl+C'; } };
    W.body.querySelector('[data-restore]').onclick = async () => {
      let data;
      try { data = JSON.parse(decodeURIComponent(escape(atob(W.body.querySelector('[data-in]').value.trim())))); } catch (e) { msgBox('Restore', "That doesn't look like a backup code. Copy the whole thing and try again.", ['OK'], 'warn'); return; }
      const keys = Object.keys(data || {}).filter(k => k.startsWith('r1990:'));
      if (!keys.length) { msgBox('Restore', 'That backup code is empty.', ['OK'], 'warn'); return; }
      const r = await msgBox('Restore', 'This replaces everything saved on this computer with the backup. Continue?', ['Restore', 'Cancel'], 'warn');
      if (r !== 'Restore') return;
      try { Object.keys(allSaved()).forEach(k => localStorage.removeItem(k)); keys.forEach(k => localStorage.setItem(k, data[k])); } catch (e) {}
      location.reload();
    };
    W.body.querySelector('[data-ok]').onclick = () => closeWin(W);
  }});
}
async function eraseAll() {
  const r = await msgBox('Erase hard drive', 'This deletes everything: purchased games, money, notes, high scores and guestbook entries. It can\'t be undone (unless you saved a backup code).\n\nErase everything?', ['Erase', 'Cancel'], 'stop');
  if (r !== 'Erase') return;
  try { Object.keys(allSaved()).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  location.reload();
}

/* --- settings --- */
function openSettings() {
  openWin({ id: 'cp', title: 'Control Panel', icon: 'cp', w: 360, fixed: true, autoH: true, build(W) {
    W.body.innerHTML = `<div class="cp">
      <fieldset><legend>Sound</legend><label>Volume <input type="range" min="0" max="1" step="0.05" data-vol style="width:100%"></label><button class="btn" data-test>Test sound</button></fieldset>
      <fieldset><legend>Monitor</legend><label><input type="checkbox" data-crt> Old monitor glow and scan lines</label><label><input type="checkbox" data-saver> ${esc(era.saverName)} screen saver after 1 minute</label></fieldset>
      <fieldset><legend>Desktop color</legend><div class="sws"></div></fieldset>
      <fieldset><legend>Time machine</legend><button class="btn" data-tw>Travel to another year…</button></fieldset>
      <fieldset><legend>Saving</legend><small>Everything saves automatically in this browser.</small><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-bk>Backup &amp; restore…</button><button class="btn" data-erase>Erase hard drive…</button></div></fieldset>
      <div style="text-align:right"><button class="btn" data-ok>OK</button></div></div>`;
    const b = W.body;
    const vol = b.querySelector('[data-vol]'); vol.value = settings.vol;
    vol.oninput = () => { settings.vol = +vol.value; if (master) master.gain.value = settings.vol; saveSettings(); };
    b.querySelector('[data-test]').onclick = () => sfx[era.sounds.start]();
    const crt = b.querySelector('[data-crt]'); crt.checked = settings.crt;
    crt.onchange = () => { settings.crt = crt.checked; screen.classList.toggle('crt', settings.crt); saveSettings(); };
    const sv = b.querySelector('[data-saver]'); sv.checked = settings.saver;
    sv.onchange = () => { settings.saver = sv.checked; saveSettings(); };
    const sws = b.querySelector('.sws');
    era.walls.forEach(([k, c, l, sw]) => {
      const x = document.createElement('button'); x.style.background = sw || c; x.title = l; x.setAttribute('aria-label', l);
      x.setAttribute('aria-pressed', eraCfg().wall === k);
      x.onclick = () => { eraCfg().wall = k; applyWall(); saveSettings(); $$('button', sws).forEach(y => y.setAttribute('aria-pressed', y === x)); };
      sws.appendChild(x);
    });
    b.querySelector('[data-tw]').onclick = e => openTW(e.currentTarget);
    b.querySelector('[data-bk]').onclick = openBackup;
    b.querySelector('[data-erase]').onclick = eraseAll;
    b.querySelector('[data-ok]').onclick = () => closeWin(W);
  }});
}

/* --- mines --- */
const faceSvg = k => {
  const eyes = k === 'dead' ? '<path d="M7 8l3 3M10 8l-3 3M14 8l3 3M17 8l-3 3" stroke="#000" stroke-width="1.3"/>' :
    k === 'cool' ? '<rect x="5" y="8" width="14" height="3" fill="#000"/>' : '<rect x="8" y="8" width="2" height="3" fill="#000"/><rect x="14" y="8" width="2" height="3" fill="#000"/>';
  const mouth = k === 'oh' ? '<circle cx="12" cy="16" r="2" fill="#000"/>' : k === 'dead' ? '<path d="M8 18q4-4 8 0" fill="none" stroke="#000" stroke-width="1.4"/>' : '<path d="M8 14q4 5 8 0" fill="none" stroke="#000" stroke-width="1.4"/>';
  return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#ff0" stroke="#000"/>${eyes}${mouth}</svg>`;
};
const FLAG = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="2" width="2" height="9" fill="#000"/><polygon points="9,2 9,8 3,5" fill="#f00"/><rect x="4" y="11" width="8" height="2" fill="#000"/></svg>';
const MINE = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.5" fill="#000"/><path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" stroke="#000" stroke-width="1.4"/><rect x="6" y="6" width="2" height="2" fill="#fff"/></svg>';
function openMines() {
  openWin({ id: 'mines', title: 'Mines', icon: 'mines', w: 262, fixed: true, autoH: true, build(W) {
    const R = 9, C = 9, N = 10;
    menubar(W, [{ label: 'Game', items: [{ label: 'New game', fn: reset }, { label: 'How to play', fn: () => msgBox('How to play Mines', 'Uncover every square that doesn\'t hide a mine.\n\nA number tells you how many mines touch that square.\n\nRight-click (or long-press, or turn on flag mode) to plant a flag where you think a mine is.') }] }]);
    W.body.innerHTML = `<div style="padding:6px;display:flex;flex-direction:column;align-items:center;gap:6px"><div class="mines"><div class="mhead"><div class="mled" data-left>010</div><button class="face" aria-label="New game"></button><div class="mled" data-time>000</div></div><div class="mgrid" style="grid-template-columns:repeat(${C},24px)"></div></div><label class="fm"><input type="checkbox" data-fm> Flag mode</label></div>`;
    const grid = W.body.querySelector('.mgrid'), face = W.body.querySelector('.face'), left = W.body.querySelector('[data-left]'), time = W.body.querySelector('[data-time]'), fm = W.body.querySelector('[data-fm]');
    let mines, open, flag, over, started, secs, timer, cells;
    const nb = i => { const r = i / C | 0, c = i % C, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < R && cc >= 0 && cc < C) out.push(rr * C + cc); } return out; };
    function reset() {
      clearInterval(timer); mines = new Set(); open = new Set(); flag = new Set(); over = false; started = false; secs = 0;
      grid.innerHTML = ''; cells = [];
      for (let i = 0; i < R * C; i++) { const b = document.createElement('button'); b.className = 'mc'; b.dataset.i = i; b.setAttribute('aria-label', 'Hidden square'); grid.appendChild(b); cells.push(b); }
      face.innerHTML = faceSvg('smile'); update();
    }
    function update() { left.textContent = String(Math.max(-99, N - flag.size)).padStart(3, '0'); time.textContent = String(Math.min(999, secs)).padStart(3, '0'); }
    function plant(safe) {
      const bad = new Set([safe, ...nb(safe)]);
      while (mines.size < N) { const k = Math.random() * R * C | 0; if (!bad.has(k)) mines.add(k); }
      started = true; timer = setInterval(() => { secs++; update(); }, 1000);
    }
    function reveal(i) {
      if (over || open.has(i) || flag.has(i)) return;
      if (!started) plant(i);
      if (mines.has(i)) { lose(i); return; }
      const stack = [i];
      while (stack.length) {
        const k = stack.pop(); if (open.has(k) || flag.has(k)) continue;
        open.add(k);
        const n = nb(k).filter(x => mines.has(x)).length;
        const b = cells[k]; b.classList.add('open'); b.textContent = n || ''; if (n) b.classList.add('n' + n);
        b.setAttribute('aria-label', n ? n + ' mines nearby' : 'Empty');
        if (!n) nb(k).forEach(x => stack.push(x));
      }
      sfx.blip(520);
      if (open.size === R * C - N) win();
    }
    function toggleFlag(i) {
      if (over || open.has(i)) return;
      if (flag.has(i)) { flag.delete(i); cells[i].innerHTML = ''; } else { flag.add(i); cells[i].innerHTML = FLAG; }
      sfx.blip(330); update();
    }
    function lose(i) {
      over = true; clearInterval(timer); sfx.boom();
      mines.forEach(k => { if (!flag.has(k)) { cells[k].classList.add('open'); cells[k].innerHTML = MINE; } });
      cells[i].classList.add('boom'); face.innerHTML = faceSvg('dead');
    }
    function win() {
      over = true; clearInterval(timer); face.innerHTML = faceSvg('cool');
      mines.forEach(k => { flag.add(k); cells[k].innerHTML = FLAG; }); update();
      sfx.tada();
      const best = store.get('minesBest', null);
      if (!best || secs < best) store.set('minesBest', secs);
      earn(5, 'winning Mines');
      setTimeout(() => msgBox('Mines', `You cleared the field in ${secs} seconds!` + (best && secs >= best ? `\nYour best is ${best} seconds.` : '\nThat\'s a new best time.')), 400);
    }
    let press = null, suppress = false;
    grid.addEventListener('pointerdown', e => {
      const b = e.target.closest('.mc'); if (!b || over) return;
      face.innerHTML = faceSvg('oh');
      if (e.pointerType !== 'mouse') press = setTimeout(() => { toggleFlag(+b.dataset.i); suppress = true; if (navigator.vibrate) navigator.vibrate(20); }, 450);
    });
    const endPress = () => { clearTimeout(press); if (!over) face.innerHTML = faceSvg('smile'); };
    grid.addEventListener('pointerup', endPress); grid.addEventListener('pointerleave', endPress); grid.addEventListener('pointercancel', endPress);
    grid.addEventListener('click', e => {
      const b = e.target.closest('.mc'); if (!b) return;
      if (suppress) { suppress = false; return; }
      const i = +b.dataset.i; fm.checked ? toggleFlag(i) : reveal(i);
    });
    grid.addEventListener('contextmenu', e => { const b = e.target.closest('.mc'); if (!b) return; e.preventDefault(); if (!suppress) toggleFlag(+b.dataset.i); suppress = false; });
    face.onclick = reset;
    W.onClose = () => clearInterval(timer);
    reset();
  }});
}

/* --- worm --- */
function openWorm() {
  openWin({ id: 'worm', title: 'Worm', icon: 'worm', w: 520, h: 520, build(W) {
    W.body.innerHTML = `<div class="worm"><div class="hud"><b data-score>Score: 0</b><span data-best></span><button class="btn" data-start>Start</button></div><canvas width="320" height="240" aria-label="Worm game board"></canvas><div class="pad" aria-label="Direction buttons"><button class="btn" data-d="up" aria-label="Up">▲</button><button class="btn" data-d="left" aria-label="Left">◀</button><button class="btn" data-d="down" aria-label="Down">▼</button><button class="btn" data-d="right" aria-label="Right">▶</button></div><small>Arrow keys or swipe to steer. Eat the numbers. Don't hit the walls or yourself.</small></div>`;
    const cv = W.body.querySelector('canvas'), g = cv.getContext('2d');
    const CW = 32, CH = 24, S = 10;
    const scoreEl = W.body.querySelector('[data-score]'), bestEl = W.body.querySelector('[data-best]'), startB = W.body.querySelector('[data-start]');
    let worm, dir, queue, food, grow, score, loop = null, alive = false, paused = false, speed;
    const best = () => store.get('wormBest', 0);
    bestEl.textContent = 'Best: ' + best();
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    function place() {
      let p; do { p = { x: 1 + (Math.random() * (CW - 2) | 0), y: 1 + (Math.random() * (CH - 2) | 0) }; } while (worm.some(s => s.x === p.x && s.y === p.y));
      food = { ...p, n: food ? (food.n % 9) + 1 : 1 };
    }
    function draw(msg) {
      g.fillStyle = '#0000a8'; g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#a80000'; g.fillRect(0, 0, 320, S); g.fillRect(0, 230, 320, S); g.fillRect(0, 0, S, 240); g.fillRect(310, 0, S, 240);
      if (worm) {
        g.fillStyle = '#fcfc54'; worm.forEach(s => g.fillRect(s.x * S, s.y * S, S, S));
        if (food) { g.fillStyle = '#fff'; g.font = '14px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(food.n, food.x * S + 5, food.y * S + 6); }
      }
      if (msg) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(40, 96, 240, 48); g.fillStyle = '#fff'; g.font = '22px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(msg, 160, 120); }
    }
    function start() {
      worm = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }]; dir = 'right'; queue = []; food = null; grow = 0; score = 0; speed = 115;
      place(); alive = true; paused = false; scoreEl.textContent = 'Score: 0'; startB.textContent = 'Restart';
      clearInterval(loop); loop = setInterval(tick, speed); draw();
    }
    function tick() {
      if (paused || !alive) return;
      if (queue.length) { const d = queue.shift(); dir = d; }
      const h = worm[0], [dx, dy] = DIRS[dir], n = { x: h.x + dx, y: h.y + dy };
      if (n.x < 1 || n.y < 1 || n.x >= CW - 1 || n.y >= CH - 1 || worm.some(s => s.x === n.x && s.y === n.y)) return die();
      worm.unshift(n);
      if (food && n.x === food.x && n.y === food.y) {
        score += food.n * 10; grow += 3 + food.n; sfx.blip(440 + food.n * 60);
        scoreEl.textContent = 'Score: ' + score;
        if (food.n === 9) { speed = Math.max(55, speed - 12); clearInterval(loop); loop = setInterval(tick, speed); sfx.tada(); }
        place();
      }
      if (grow > 0) grow--; else worm.pop();
      draw();
    }
    function die() {
      alive = false; clearInterval(loop); sfx.crash();
      if (score > best()) { store.set('wormBest', score); bestEl.textContent = 'Best: ' + score; }
      if (score >= 100) earn(Math.min(10, Math.floor(score / 100)), 'your Worm score');
      draw('Game over! Score ' + score);
      startB.textContent = 'Play again';
    }
    function steer(d) {
      if (!alive) { start(); return; }
      const last = queue.length ? queue[queue.length - 1] : dir;
      const opp = { up: 'down', down: 'up', left: 'right', right: 'left' };
      if (d !== last && d !== opp[last] && queue.length < 3) queue.push(d);
    }
    W.onKey = e => {
      const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key];
      if (m) { e.preventDefault(); steer(m); }
      else if (e.key === ' ' && alive) { e.preventDefault(); paused = !paused; draw(paused ? 'Paused' : null); }
    };
    W.body.querySelectorAll('[data-d]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); steer(b.dataset.d); }));
    let sx = 0, sy = 0;
    cv.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    cv.addEventListener('pointerup', e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { if (!alive) start(); return; }
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    startB.onclick = start;
    W.onMin = () => { if (alive) { paused = true; draw('Paused'); } };
    W.onClose = () => clearInterval(loop);
    draw('Press Start');
  }});
}

/* --- paint --- */
function openPaint() {
  openWin({ id: 'paint', title: 'Paintbox - (Untitled)', icon: 'paint', w: 600, h: 480, build(W) {
    const VGA = ['#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0', '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'];
    const TOOLS = {
      pencil: '<svg viewBox="0 0 18 18"><path d="M3 15l2-5 8-8 3 3-8 8z" fill="#ff0" stroke="#000"/><path d="M3 15l2-5 3 3z" fill="#000"/></svg>',
      brush: '<svg viewBox="0 0 18 18"><rect x="11" y="1" width="3" height="9" transform="rotate(35 12 6)" fill="#800000"/><path d="M3 16c0-4 3-6 6-5-1 3-3 5-6 5z" fill="#000"/></svg>',
      spray: '<svg viewBox="0 0 18 18"><rect x="8" y="6" width="7" height="11" fill="#808080" stroke="#000"/><rect x="10" y="3" width="3" height="3" fill="#000"/><g fill="#000"><rect x="3" y="2" width="1" height="1"/><rect x="5" y="4" width="1" height="1"/><rect x="2" y="5" width="1" height="1"/><rect x="6" y="1" width="1" height="1"/></g></svg>',
      fill: '<svg viewBox="0 0 18 18"><path d="M3 9l6-6 6 6-6 6z" fill="#fff" stroke="#000"/><path d="M15 9c1 2 2 4 1 5s-2-1-1-5z" fill="#00f"/></svg>',
      eraser: '<svg viewBox="0 0 18 18"><path d="M2 12l7-7 6 6-4 4H6z" fill="#ffc0cb" stroke="#000"/></svg>',
      rect: '<svg viewBox="0 0 18 18"><rect x="3" y="4" width="12" height="10" fill="none" stroke="#000" stroke-width="2"/></svg>'
    };
    menubar(W, [{ label: 'File', items: [{ label: 'New picture', fn: () => { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); } }, { label: 'Exit', fn: () => closeWin(W) }] }]);
    W.body.innerHTML = `<div class="paint"><div class="main"><div class="tools">${Object.entries(TOOLS).map(([k, s]) => `<button class="btn" data-t="${k}" title="${k}" aria-label="${k}">${s}</button>`).join('')}<label style="grid-column:span 2;font-size:11px;margin-top:6px">Size<br><input type="range" min="1" max="4" value="2" data-size style="width:60px"></label></div><div class="well sunken"><canvas width="560" height="360" aria-label="Drawing canvas"></canvas></div></div><div class="pal"><div class="cur"></div><div class="sw">${VGA.map(c => `<button style="background:${c}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div></div>`;
    const cv = W.body.querySelector('canvas'), g = cv.getContext('2d'), cur = W.body.querySelector('.cur'), sizeEl = W.body.querySelector('[data-size]');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    let tool = 'brush', color = '#000000', drawing = false, last = null, sprayT = null, startPt = null, snap = null;
    const setTool = t => { tool = t; $$('[data-t]', W.body).forEach(b => b.classList.toggle('down', b.dataset.t === t)); };
    const setColor = c => { color = c; cur.style.background = c; };
    setTool('brush'); setColor('#000000');
    $$('[data-t]', W.body).forEach(b => b.onclick = () => setTool(b.dataset.t));
    $$('[data-c]', W.body).forEach(b => b.onclick = () => setColor(b.dataset.c));
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
    const size = () => ({ pencil: 1, brush: 3, eraser: 8, spray: 10, rect: 1 }[tool] || 2) * +sizeEl.value;
    function line(a, b, c) { g.strokeStyle = c; g.lineWidth = size(); g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    function spray(p) { g.fillStyle = color; const r = size() * 1.5; for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, d = Math.random() * r; g.fillRect(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1, 1); } }
    function flood(p) {
      const x0 = p.x | 0, y0 = p.y | 0, w = cv.width, h = cv.height;
      const img = g.getImageData(0, 0, w, h), d = img.data;
      const idx = (x0 + y0 * w) * 4, tr = d[idx], tg = d[idx + 1], tb = d[idx + 2];
      const nr = parseInt(color.slice(1, 3), 16), ng = parseInt(color.slice(3, 5), 16), nbb = parseInt(color.slice(5, 7), 16);
      if (tr === nr && tg === ng && tb === nbb) return;
      const match = i => Math.abs(d[i] - tr) < 24 && Math.abs(d[i + 1] - tg) < 24 && Math.abs(d[i + 2] - tb) < 24;
      const st = [[x0, y0]];
      while (st.length) {
        let [x, y] = st.pop(); let i = (x + y * w) * 4;
        while (x >= 0 && match(i)) { x--; i -= 4; }
        x++; i += 4; let up = false, dn = false;
        while (x < w && match(i)) {
          d[i] = nr; d[i + 1] = ng; d[i + 2] = nbb; d[i + 3] = 255;
          if (y > 0) { const u = i - w * 4; if (match(u)) { if (!up) { st.push([x, y - 1]); up = true; } } else up = false; }
          if (y < h - 1) { const q = i + w * 4; if (match(q)) { if (!dn) { st.push([x, y + 1]); dn = true; } } else dn = false; }
          x++; i += 4;
        }
      }
      g.putImageData(img, 0, 0);
    }
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const p = pt(e); drawing = true; last = p;
      if (tool === 'fill') { flood(p); drawing = false; return; }
      if (tool === 'spray') { spray(p); sprayT = setInterval(() => last && spray(last), 30); return; }
      if (tool === 'rect') { startPt = p; snap = g.getImageData(0, 0, cv.width, cv.height); return; }
      line(p, { x: p.x + 0.01, y: p.y }, tool === 'eraser' ? '#ffffff' : color);
    });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return; const p = pt(e);
      if (tool === 'spray') { last = p; return; }
      if (tool === 'rect') { g.putImageData(snap, 0, 0); g.strokeStyle = color; g.lineWidth = +sizeEl.value; g.strokeRect(startPt.x, startPt.y, p.x - startPt.x, p.y - startPt.y); return; }
      line(last, p, tool === 'eraser' ? '#ffffff' : color); last = p;
    });
    const end = () => { drawing = false; clearInterval(sprayT); snap = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    W.onClose = () => clearInterval(sprayT);
  }});
}

/* --- chat room (1995) and instant messenger (2000) --- */
function botReply(bot, text, cfg) {
  const t = text.toLowerCase();
  for (const [re, lines] of (bot.replies || []).concat(cfg.replies || [])) if (re.test(t)) return pick(lines);
  return pick(bot.generic || cfg.generic);
}
const subst = s => s.replace(/\{me\}/g, store.get('user', 'kidsurfer')).replace(/\{year\}/g, era.year);
function openChat(cfg) {
  openWin({ id: cfg.id, title: cfg.label, icon: cfg.mode === 'im' ? 'im' : 'chat', w: cfg.mode === 'im' ? 480 : 540, h: 400, build(W) {
    const me = () => store.get('user', 'kidsurfer');
    W.body.innerHTML = `<div class="chat"><div class="main"><div class="people sunken"></div><div class="log sunken" role="log" aria-live="polite"></div></div><div class="typing" aria-live="polite"></div><form><input type="text" maxlength="160" aria-label="Message" autocomplete="off"><button class="btn" type="submit">Send</button></form></div>`;
    const people = W.body.querySelector('.people'), logEl = W.body.querySelector('.log'), typing = W.body.querySelector('.typing'), form = W.body.querySelector('form'), input = form.querySelector('input');
    if (cfg.mode === 'room') people.parentNode.appendChild(people); // member list on the right
    const timers = []; let ambient = null, alive = true, online = false;
    const later = (ms, fn) => timers.push(setTimeout(() => alive && fn(), ms));
    const logs = {}; let cur = cfg.mode === 'room' ? '#room' : null; const unread = new Set();
    function line(where, who, text, color, sys) {
      (logs[where] = logs[where] || []).push({ who, text, color, sys });
      if (logs[where].length > 150) logs[where].shift();
      if (where === cur) render(); else if (cfg.mode === 'im' && !sys) { unread.add(where); renderPeople(); }
    }
    function render() {
      logEl.innerHTML = (logs[cur] || []).map(l => l.sys ? `<div class="sys">${esc(l.text)}</div>` : `<div><b style="color:${l.color || '#000'}">${esc(l.who)}:</b>${esc(l.text)}</div>`).join('');
      logEl.scrollTop = logEl.scrollHeight;
    }
    function renderPeople() {
      if (cfg.mode === 'room') {
        people.innerHTML = `<h4>In the room (${online ? cfg.bots.length + 1 : 0})</h4>` + (online ? [me(), ...cfg.bots.map(b => b.n)].map(n => `<div>${esc(n)}</div>`).join('') : '');
        return;
      }
      people.innerHTML = '<h4>Buddies online</h4>';
      cfg.bots.forEach(b => {
        const x = document.createElement('button');
        x.className = (b.away ? 'away ' : '') + (cur === b.n ? 'sel ' : '') + (unread.has(b.n) ? 'new' : '');
        x.innerHTML = '<i></i>'; x.appendChild(document.createTextNode(b.n + (b.away ? ' (away)' : '')));
        x.disabled = !online;
        x.onclick = () => { cur = b.n; unread.delete(b.n); renderPeople(); render(); typing.textContent = ''; input.focus(); };
        people.appendChild(x);
      });
    }
    function signOn() {
      if (online || !net.connected) return;
      online = true;
      if (cfg.mode === 'room') {
        sfx.door();
        line('#room', '', `*** You (${me()}) have entered ${cfg.room} ***`, null, true);
        cfg.bots.slice(0, 3).forEach((b, i) => later(1200 + i * 1500, () => { line('#room', b.n, ' ' + subst(pick(b.hello)), b.c); sfx.blip(700 + i * 90); }));
        const amb = () => { ambient = setTimeout(() => { if (!alive || !online) return; const b = pick(cfg.bots); line('#room', b.n, ' ' + subst(pick(b.lines)), b.c); sfx.blip(620); amb(); }, 5000 + Math.random() * 6000); };
        amb();
      } else {
        sfx.door();
        cur = cfg.bots[0].n;
        cfg.bots.forEach(b => line(b.n, '', `You're chatting with ${b.n}.${b.away ? ' Away message: "' + b.away + '"' : ''}`, null, true));
        later(2500, () => { const b = cfg.bots[0]; incoming(b, subst(pick(b.hello))); });
        const amb = () => { ambient = setTimeout(() => { if (!alive || !online) return; const b = pick(cfg.bots.filter(x => !x.away)); incoming(b, subst(pick(b.lines))); amb(); }, 16000 + Math.random() * 14000); };
        amb();
      }
      renderPeople(); render();
    }
    function signOff() {
      if (!online) return;
      online = false; clearTimeout(ambient);
      const where = cfg.mode === 'room' ? ['#room'] : cfg.bots.map(b => b.n);
      where.forEach(w => line(w, '', '*** You have been disconnected ***', null, true));
      renderPeople();
    }
    function incoming(b, text) {
      line(b.n, b.n, ' ' + text, b.c);
      if (cur !== b.n || activeWin() !== W) sfx.knock(); else sfx.msg();
    }
    form.onsubmit = e => {
      e.preventDefault();
      const text = input.value.trim(); if (!text) return;
      if (!online) { typing.textContent = cfg.offline; return; }
      input.value = ''; sfx.sent();
      if (cfg.mode === 'room') {
        line('#room', me(), ' ' + text, '#000080');
        const b = pick(cfg.bots);
        later(1200 + Math.random() * 2200, () => { if (online) { line('#room', b.n, ' ' + subst(botReply(b, text, cfg)), b.c); sfx.blip(700); } });
      } else {
        const b = cfg.bots.find(x => x.n === cur); if (!b) return;
        line(b.n, me(), ' ' + text, '#c00000');
        if (b.away) { later(600, () => { line(b.n, b.n, ' Auto-response: ' + b.away, b.c); sfx.msg(); }); return; }
        later(700, () => { if (cur === b.n && online) typing.textContent = b.n + ' is typing…'; });
        later(2200 + Math.random() * 2200, () => { if (!online) return; if (typing.textContent.startsWith(b.n)) typing.textContent = ''; incoming(b, subst(botReply(b, text, cfg))); });
      }
    };
    input.addEventListener('keydown', e => { if (e.key.length === 1) sfx.key(); });
    W.onNet = () => { if (net.connected) signOn(); else signOff(); };
    W.onClose = () => { alive = false; clearTimeout(ambient); timers.forEach(clearTimeout); };
    renderPeople();
    if (net.connected) signOn();
    else {
      logEl.innerHTML = `<div class="sys">${esc(cfg.offline)}</div><p><button class="btn" data-dial>Open ${esc(era.modem.appLabel || 'Dial-Up Connection')}</button></p>`;
      logEl.querySelector('[data-dial]').onclick = () => openDial(true);
    }
  }});
}

/* --- jukebox (2000) --- */
function openJukebox(autoplay) {
  const W = openWin({ id: 'jb', title: 'Jukebox', icon: 'jb', w: 340, h: 330, build(W) {
    W.body.innerHTML = `<div class="jb"><div class="scr"><canvas width="60" height="22"></canvas><div class="now"><b data-t>Nothing playing</b><span data-s>Pick a song below</span></div></div><div class="ctl"><button data-a="play">▶ Play</button><button data-a="stop">■ Stop</button><button data-a="next">▶▶ Next</button></div><ol></ol></div>`;
    const ol = W.body.querySelector('ol'), tEl = W.body.querySelector('[data-t]'), sEl = W.body.querySelector('[data-s]'), cv = W.body.querySelector('canvas'), g = cv.getContext('2d');
    let idx = -1, raf = 0, started = 0;
    const list = () => era.songs.filter(s => !s.locked || estore.get('got:' + s.locked, false));
    function renderList() {
      ol.innerHTML = '';
      list().forEach((s, i) => {
        const li = document.createElement('li'); li.className = i === idx && music && music.owner === 'jb' ? 'on' : '';
        li.innerHTML = `${esc(s.a)} - ${esc(s.t)} <small>${s.len}</small>`; li.onclick = () => play(i); ol.appendChild(li);
      });
      const locked = era.songs.filter(s => s.locked && !estore.get('got:' + s.locked, false));
      if (locked.length) { const li = document.createElement('li'); li.innerHTML = `<small>+ ${locked.length} more on the Web. Try the Download Depot!</small>`; li.style.cursor = 'default'; ol.appendChild(li); }
    }
    function play(i) {
      const L = list(); if (!L.length) return;
      idx = (i + L.length) % L.length;
      const m = playMusic(L[idx].song, 'jb');
      tEl.textContent = `${idx + 1}. ${L[idx].a} - ${L[idx].t}`; sEl.textContent = `128 kbps · 44 kHz · stereo`;
      started = performance.now(); renderList(); viz(m);
    }
    function stop() { stopMusic('jb'); cancelAnimationFrame(raf); tEl.textContent = 'Stopped'; sEl.textContent = ''; g.fillStyle = '#000'; g.fillRect(0, 0, 60, 22); renderList(); }
    function viz(m) {
      cancelAnimationFrame(raf);
      const data = new Uint8Array(m ? m.an.frequencyBinCount : 16);
      const frame = () => {
        if (!music || music.owner !== 'jb') { g.fillStyle = '#000'; g.fillRect(0, 0, 60, 22); return; }
        music.an.getByteFrequencyData(data);
        g.fillStyle = '#000'; g.fillRect(0, 0, 60, 22);
        for (let i = 0; i < 15; i++) { const v = data[i + 1] / 255 * 22 | 0; for (let y = 0; y < v; y += 2) { g.fillStyle = y > 15 ? '#f00' : y > 9 ? '#ff0' : '#0f0'; g.fillRect(i * 4, 21 - y, 3, 1); } }
        const s = (performance.now() - started) / 1000 | 0; sEl.textContent = `${s / 60 | 0}:${String(s % 60).padStart(2, '0')} · 128 kbps · stereo`;
        raf = requestAnimationFrame(frame);
      };
      frame();
    }
    W.body.querySelector('[data-a=play]').onclick = () => play(idx < 0 ? 0 : idx);
    W.body.querySelector('[data-a=stop]').onclick = stop;
    W.body.querySelector('[data-a=next]').onclick = () => play(idx + 1);
    W.playSong = s => { const i = list().indexOf(s); play(i < 0 ? 0 : i); };
    W.onClose = () => { stopMusic('jb'); cancelAnimationFrame(raf); };
    renderList();
  }});
  if (autoplay && W.playSong) W.playSong(autoplay);
  return W;
}

/* ---------- screensavers ---------- */
const saver = $('#saver'); let idleT = 0, saverOn = false, saverRAF = 0;
function wake() {
  idleT = Date.now();
  if (saverOn) { saverOn = false; saver.style.display = 'none'; cancelAnimationFrame(saverRAF); }
}
['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));
setInterval(() => {
  if (saverOn || !settings.saver || !stageOn('st-desk')) return;
  if (music && music.owner === 'jb') { idleT = Date.now(); return; }
  if (Date.now() - idleT > 60000) startSaver();
}, 2000);
function startSaver() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  closeStart(); closeTW();
  saverOn = true; saver.style.display = 'block';
  const r = saver.getBoundingClientRect(); saver.width = r.width; saver.height = r.height;
  const g = saver.getContext('2d'), Wd = r.width, Ht = r.height;
  g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Ht);
  let frame;
  if (era.saver === 'mystify') {
    const mk = () => Array.from({ length: 4 }, () => ({ x: Math.random() * Wd, y: Math.random() * Ht, dx: (Math.random() * 4 + 2) * (Math.random() < 0.5 ? -1 : 1), dy: (Math.random() * 4 + 2) * (Math.random() < 0.5 ? -1 : 1) }));
    const shapes = [{ p: mk(), h: 200 }, { p: mk(), h: 30 }];
    frame = () => {
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, Wd, Ht);
      shapes.forEach(s => {
        s.h = (s.h + 0.6) % 360;
        s.p.forEach(v => { v.x += v.dx; v.y += v.dy; if (v.x < 0 || v.x > Wd) v.dx *= -1; if (v.y < 0 || v.y > Ht) v.dy *= -1; });
        g.strokeStyle = `hsl(${s.h},100%,60%)`; g.lineWidth = 1.5; g.beginPath();
        s.p.forEach((v, i) => i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)); g.closePath(); g.stroke();
      });
    };
  } else if (era.saver === 'bounce') {
    const text = era.saverText; let x = Wd / 3, y = Ht / 3, dx = 2.2, dy = 1.8, h = 200;
    g.font = '700 42px Tahoma, Verdana, sans-serif';
    const tw = g.measureText(text).width;
    frame = () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Ht);
      x += dx; y += dy;
      if (x < 0 || x + tw > Wd) { dx *= -1; h = (h + 67) % 360; x = Math.max(0, Math.min(x, Wd - tw)); }
      if (y < 42 || y > Ht) { dy *= -1; h = (h + 67) % 360; y = Math.max(42, Math.min(y, Ht)); }
      g.font = '700 42px Tahoma, Verdana, sans-serif'; g.fillStyle = `hsl(${h},90%,60%)`; g.fillText(text, x, y);
    };
  } else {
    const cx = Wd / 2, cy = Ht / 2;
    const stars = Array.from({ length: 220 }, () => ({ x: (Math.random() - 0.5) * Wd, y: (Math.random() - 0.5) * Ht, z: Math.random() * Wd }));
    frame = () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Ht);
      stars.forEach(s => {
        s.z -= 6; if (s.z < 1) { s.z = Wd; s.x = (Math.random() - 0.5) * Wd; s.y = (Math.random() - 0.5) * Ht; }
        const k = 200 / s.z, x = cx + s.x * k, y = cy + s.y * k, sz = Math.max(1, 3 - s.z / 250);
        g.fillStyle = s.z < 200 ? '#fff' : '#aaa'; g.fillRect(x, y, sz, sz);
      });
    };
  }
  const loop = () => { frame(); if (saverOn) saverRAF = requestAnimationFrame(loop); };
  loop();
}

/* ---------- clock ---------- */
function tickClock() {
  if (!era) return;
  const d = new Date();
  $('#clock').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  $('#clock').title = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + ', ' + era.year;
}
setInterval(tickClock, 15000);

/* ---------- time machine ---------- */
function setEra(id) {
  era = ERAS[id] || ERAS[ERA_IDS[0]];
  store.set('era', era.id);
  ERA_IDS.forEach(k => screen.classList.toggle('era-' + k, k === era.id));
  document.title = 'Log On to ' + era.year;
  $('#st-splash').innerHTML = era.splash;
  applyWall(); setupTaskbar(); tickClock();
  try { history.replaceState(null, '', '#' + era.id); } catch (e) {}
}
function renderPower() {
  $('#pw-head').innerHTML = `It's ${era.year}.<br>The computer is off.`;
  $('#pw-blurb').textContent = era.power;
  const box = $('#pw-eras'); box.innerHTML = '';
  ERA_IDS.forEach(id => {
    const E = ERAS[id], b = document.createElement('button');
    b.className = 'era-card'; b.setAttribute('aria-pressed', id === era.id);
    b.innerHTML = `<b>${E.year}</b>${esc(E.os.name + ' ' + E.os.short)}<small>${esc(E.speedBlurb)}</small>`;
    b.onclick = () => { setEra(id); renderPower(); sfx.click(); };
    box.appendChild(b);
  });
}
function openTW(anchor) {
  const p = $('#tw-panel');
  if (p.classList.contains('on')) { closeTW(); return; }
  closeStart(); closeMenu();
  p.innerHTML = `<h3>Time Machine</h3><p>Pick a year. The computer restarts there. Your notes and high scores come with you.</p>`;
  ERA_IDS.forEach(id => {
    const E = ERAS[id], b = document.createElement('button');
    b.className = 'era'; b.setAttribute('aria-current', id === era.id && booted);
    b.innerHTML = `<b>${E.year}</b><span>${esc(E.os.name + ' ' + E.os.short)}</span><small>${esc(E.speedBlurb)}</small>`;
    b.onclick = () => switchEra(id);
    p.appendChild(b);
  });
  p.classList.add('on');
  const S = screen.getBoundingClientRect();
  const r = (anchor || (stageOn('st-desk') ? $('#tw-task') : $('#tw-float'))).getBoundingClientRect();
  const pr = p.getBoundingClientRect();
  p.style.left = Math.max(4, Math.min(r.right - S.left - pr.width, S.width - pr.width - 4)) + 'px';
  p.style.top = (r.top - S.top > S.height / 2 ? Math.max(4, r.top - S.top - pr.height - 2) : r.bottom - S.top + 4) + 'px';
  const cur = p.querySelector('[aria-current=true]') || p.querySelector('button'); cur && cur.focus();
}
function closeTW() { $('#tw-panel').classList.remove('on'); }
$('#tw-task').onclick = e => openTW(e.currentTarget);
$('#tw-float').onclick = e => openTW(e.currentTarget);
$('#tw-float').innerHTML = 'Time machine';
function teardown() {
  if (call) { call.cancel(); call = null; }
  if (net.connected) hangUp();
  net.dropped = false;
  stopMusic(); wake(); closeMenu(); closeStart(); closeTW(); closeAll();
  $$('#deskicons').forEach(x => x.remove());
  document.body.classList.remove('wait');
  visited.clear();
}
async function switchEra(id) {
  closeTW();
  if (id === era.id && booted && stageOn('st-desk')) return;
  bootTok++; skipping = true; booted = false;
  teardown();
  if (stageOn('st-power')) { setEra(id); renderPower(); return; }
  powerAnim('poweroff'); noise(0.08, { ft: 'lowpass', f: 300, vol: 0.5, decay: 1 });
  await sleep(480);
  screen.classList.remove('poweroff');
  setEra(id);
  boot();
}

/* ---------- boot / shutdown ---------- */
let booted = false, skipping = false, bootTok = 0;
const bios = $('#bios');
async function boot() {
  const my = ++bootTok; skipping = false; booted = false;
  audio();
  bios.innerHTML = '';
  $('#skip').classList.add('on');
  show('st-bios'); powerAnim('poweron');
  const live = () => my === bootTok && !skipping;
  const B = {
    live, sfx, tone, bios,
    wait: async ms => { await sleep(ms); return live(); },
    async type(line, cls, delay = 0) {
      if (!live()) return;
      const span = document.createElement('span'); if (cls) span.className = cls; bios.appendChild(span);
      if (!delay) { span.textContent = line + '\n'; return; }
      for (const ch of line) { if (!live()) return; span.textContent += ch; if (ch !== ' ') sfx.key(); await sleep(delay); }
      span.textContent += '\n';
    },
    async memTest(kb, stepKb, ms = 40) {
      const mem = document.createElement('span'); bios.appendChild(mem);
      for (let k = 0; k <= kb; k += stepKb) { if (!live()) return false; mem.textContent = `Memory Test: ${String(k).padStart(6)}K`; if (k % (stepKb * 4) === 0) tone(1800, 0.01, { vol: 0.02 }); await sleep(ms); }
      mem.textContent += ' OK\n'; return true;
    },
    prompt(text) { bios.appendChild(document.createTextNode(text)); },
    clear(html = '') { bios.innerHTML = html; },
    splash() { if (!live()) return; show('st-splash'); sfx[era.sounds.start](); }
  };
  const ok = await era.boot(B);
  if (ok && live()) toDesktop();
}
function toDesktop() {
  if (booted) return;
  booted = true; skipping = true;
  $('#skip').classList.remove('on');
  show('st-desk'); idleT = Date.now();
  $$('#deskicons').forEach(x => x.remove());
  setupTaskbar();
  if (era.shell === 'start') buildStartShell(); else openProgman();
  allowance();
  const pend = store.get('pending', []).filter(id => PLUGINS[id] && !isOwned(id));
  if (pend.length) setTimeout(() => { if (booted) install(PLUGINS[pend[0]]); }, 1200);
  if (!estore.get('seenReadme', false)) { estore.set('seenReadme', true); setTimeout(() => { if (booted) openNotepad('README.TXT'); }, 500); }
}
function powerAnim(cls) { screen.classList.remove('poweron', 'poweroff'); void screen.offsetWidth; screen.classList.add(cls); }
$('#skip').onclick = () => { skipping = true; sfx[era.sounds.start](); toDesktop(); };
$('#pwr').onclick = () => {
  audio();
  noise(0.08, { ft: 'lowpass', f: 300, vol: 0.6, decay: 1 });
  tone(55, 1.2, { type: 'sine', vol: 0.12, decay: 1 });
  boot();
};
async function askShutdown() {
  closeStart();
  const r = await msgBox(era.os.shutTitle, era.os.shutText, ['OK', 'Cancel'], 'warn');
  if (r === 'OK') shutdown();
}
async function shutdown() {
  bootTok++; booted = false;
  teardown();
  const bye = $('#st-bye'), t = $('#byeText'), again = $('#relight');
  bye.classList.add('shutting'); t.textContent = era.os.name + ' is shutting down…'; again.hidden = true;
  show('st-bye'); sfx[era.sounds.bye](); sfx.seek(10);
  const my = bootTok;
  await sleep(2600); if (my !== bootTok) return;
  bye.classList.remove('shutting');
  t.textContent = "It's now safe to turn off your computer.";
  again.hidden = false; again.focus();
}
$('#relight').onclick = async () => {
  powerAnim('poweroff'); noise(0.08, { ft: 'lowpass', f: 300, vol: 0.5, decay: 1 });
  await sleep(500);
  screen.classList.remove('poweroff');
  booted = false; renderPower(); show('st-power');
};
window.addEventListener('resize', () => { Object.values(wins).forEach(W => { if (W.max) W.onResize && W.onResize(); }); });

/* ---------- dev hook: add ?dev to the URL to script the computer in tests ---------- */
if (/[?&]dev\b/.test(location.search)) window.RetroPuter = {
  launch: id => launchApp(id), openApp, apps: () => apps().map(a => a.id), plugins: PLUGINS,
  own: id => { store.set('owned', [...new Set([...owned(), id])]); refreshShell(); }, cash: v => setWallet(v), wallet,
  desk: () => { if (!booted) { if (!stageOn('st-bios') && !stageOn('st-splash')) boot(); skipping = true; toDesktop(); } },
  era: () => era.id, switchEra, connect: () => { net.connected = true; refreshTray(); Object.values(wins).forEach(W => W.onNet && W.onNet()); }
};

/* ---------- start ---------- */
const fromHash = location.hash.replace('#', '');
setEra(ERAS[fromHash] ? fromHash : store.get('era', ERA_IDS[0]));
renderPower();
})();
