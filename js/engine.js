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
  work: svg('<rect x="4" y="10" width="24" height="17" rx="2" fill="#8a5a2b" stroke="#000"/><rect x="11" y="5" width="10" height="6" fill="none" stroke="#000" stroke-width="2"/><rect x="4" y="16" width="24" height="2" fill="#5a3a1b"/><rect x="14" y="15" width="4" height="4" fill="#d8b84a" stroke="#000"/>'),
  passport: svg('<rect x="6" y="3" width="20" height="26" rx="2" fill="#1a3a8a" stroke="#000"/><rect x="8" y="5" width="16" height="22" fill="none" stroke="#d8b84a"/><circle cx="16" cy="14" r="5" fill="none" stroke="#d8b84a" stroke-width="1.5"/><path d="M11 14h10M16 9v10" stroke="#d8b84a"/><rect x="11" y="22" width="10" height="2" fill="#d8b84a"/>'),
  capsule: svg('<rect x="4" y="12" width="24" height="12" rx="6" fill="#c0c0c0" stroke="#000"/><rect x="4" y="12" width="12" height="12" rx="6" fill="#e05050" stroke="#000"/><rect x="10" y="12" width="6" height="12" fill="#e05050"/><path d="M16 12v12" stroke="#000"/><path d="M8 8l2 3M16 5v4M24 8l-2 3" stroke="#d8b84a" stroke-width="2"/>'),
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
const TW_STAGES = ['st-sponsor', 'st-bios', 'st-splash', 'st-bye'];
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
  screen.style.setProperty('--phos', w[1]);
}

/* ---------- window manager ---------- */
const layer = $('#layer');
const wins = {};
let zTop = 10, cascade = 0, tearing = false;
function focusWin(W) {
  // Keep window z-indexes well below menus (8000+) in long sessions by renumbering now and then.
  if (zTop > 900) { zTop = 10; Object.values(wins).sort((a, b) => (a.el.style.zIndex % 7000) - (b.el.style.zIndex % 7000)).forEach(o => { o.el.style.zIndex = (o.modal ? 7000 : 0) + (++zTop); }); }
  Object.values(wins).forEach(o => o.el.classList.toggle('active', o === W));
  if (W) { W.el.style.zIndex = (W.modal ? 7000 : 0) + (++zTop); // dialogs always stay above ordinary windows
    W.el.classList.remove('min'); W.minimized = false; if (dos && document.activeElement === dos.input) dos.input.blur(); }
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
  if (!rest.length) dosFocus();
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
  el.className = 'win' + (o.modal ? ' modal' : '');
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
  // In 1985 every full-screen program exits with Esc (the status bar says so). A program can opt out with W.keepEsc.
  if (era.shell === 'dos' && W && !W.modal && e.key === 'Escape' && !W.keepEsc) { e.preventDefault(); closeWin(W); }
  if (era.shell === 'dos' && !W && /^F(1|2|3|10)$/.test(e.key)) { e.preventDefault(); ({ F1: () => dosRun('HELP'), F2: dosMenu, F3: () => dosRun('DIR'), F10: () => openTW(dos.el.querySelector('.dos-tm')) })[e.key](); }
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
  jb: () => ({ label: 'Jukebox', icon: 'jb', cat: 'main', open: () => openJukebox() }),
  store: () => ({ label: 'Software Store', icon: 'shop', cat: 'main', open: () => openStore() }),
  files: () => ({ label: era.shell === 'start' ? 'My Computer' : 'File Manager', icon: 'pc', cat: 'main', open: () => openFiles() }),
  help: () => ({ label: 'Quick Help', icon: 'info', cat: 'main', open: () => openHelp() }),
  work: () => ({ label: era.year < 1995 ? 'Job Board' : 'Job Center', icon: 'work', cat: 'main', open: () => openWork() }),
  passport: () => ({ label: 'Time Passport', icon: 'passport', cat: 'main', open: () => openPassport() }),
  capsule: () => ({ label: 'Time Capsule', icon: 'capsule', cat: 'acc', open: () => openCapsule() })
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
const isOwned = id => owned().includes(id) || (store.get('allAccess', false) === true && !!PLUGINS[id] && PLUGINS[id].kind === 'store');
const pluginRuns = p => p.kind === 'store' ? (p.year || 1990) <= era.year && isOwned(p.id) : (p.eras || []).includes(era.id);
const pluginDef = p => ({ id: p.id, label: p.label, icon: 'app-' + p.id, cat: p.cat || (p.kind === 'store' ? 'game' : 'game'), bought: p.kind === 'store', open: () => launchApp(p.id) });
// Everything that runs in this year, in display order.
function apps() {
  const core = [...era.apps, 'store', 'files', 'work', 'passport', 'capsule', 'help'].map(id => Object.assign({ id }, APP_DEFS[id]()));
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
    say: (text, o = {}) => say(text, o),
    dial: (number, onStatus, profile = 'v22') => modemCall(String(number).replace(/[^0-9*#]/g, ''), onStatus, profile),
    online: () => net.connected, kbps: () => net.connected ? rateKB() : 0,
    openUrl: url => era.apps.includes('nv') ? openBrowser(url) : null,
    openApp,
    stamp: id => stamp(id),
    task: (type, data) => taskEvent(type, data),
    jobs: () => (typeof todaysJobs === 'function' ? todaysJobs() : [])
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


/* Time Traveler Passport: one stamp for each year's signature activities. Apps call api.stamp(id).
   Collecting every stamp pays a bonus. Add new stamps here (and to the Quick Help money page if they pay). */
const STAMPS = [
  { id: 'basic-run', year: 1985, label: 'Wrote a BASIC program', hint: 'Type a program in BASIC and RUN it.' },
  { id: 'banner-print', year: 1985, label: 'Printed a banner', hint: 'Print a banner in Banner Maker.' },
  { id: 'bbs-call', year: 1985, label: 'Called a bulletin board', hint: 'Dial a BBS with Terminal.' },
  { id: 'mouse-grad', year: 1990, label: 'Mastered the mouse', hint: 'Finish the Mouse Tutorial.' },
  { id: 'mines-win', year: 1990, label: 'Cleared a minefield', hint: 'Win a game of Mines.' },
  { id: 'ski-run', year: 1990, label: 'Finished a ski run', hint: 'Reach the bottom of a run in Slope Rider.' },
  { id: 'pedia-look', year: 1995, label: 'Explored the CD-ROM', hint: 'Read 5 articles in RetroPedia.' },
  { id: 'home-page', year: 1995, label: 'Built a home page', hint: 'Publish a page with Home Page Builder.' },
  { id: 'chat-room', year: 1995, label: 'Joined a chat room', hint: 'Say hi in the Chat Room.' },
  { id: 'mp3-rip', year: 2000, label: 'Ripped an MP3', hint: 'Copy a CD song to the Jukebox with CD Player.' },
  { id: 'movie-make', year: 2000, label: 'Made a movie', hint: 'Save a movie in Movie Maker.' },
  { id: 'games-room-win', year: 2000, label: 'Won online', hint: 'Win a game in the Games Room.' }
];
const PASSPORT_BONUS = 25;
// Work Center: apps report finished work with api.task(type, data); see JOBS below.
function taskEvent(type, data) { try { if (typeof workTask === 'function') workTask(type, data || {}); } catch (e) { console.error(e); } }
function stamp(id) {
  const s = STAMPS.find(x => x.id === id); if (!s) return false;
  const got = store.get('stamps', {}); if (got[id]) return false;
  got[id] = Date.now(); store.set('stamps', got);
  sfx.tada(); toast(`Passport stamp: ${s.label} (${s.year})!`);
  if (STAMPS.every(x => got[x.id])) setTimeout(() => { earn(PASSPORT_BONUS, 'filling your Time Traveler Passport'); msgBox('Time Traveler Passport', `You collected every stamp from 1985 to 2000. You're an official Time Traveler!\n\nHere's a ${money(PASSPORT_BONUS)} bonus.`); }, 1200);
  if (wins.passport && wins.passport.refresh) wins.passport.refresh();
  return true;
}

/* ---------- Work Center: daily jobs checked automatically, an hourly wage, and a paycheck ----------
   Apps report finished work with api.task(type, data) (event names: js/apps/README.md). Each year gets 3 jobs a day,
   picked from JOBS by date. Jobs only use programs that exist in that year. Pay is collected on payday. */
const MIN_WAGE = { '1985': 3.35, '1990': 3.80, '1995': 4.25, '2000': 5.15 }; // US federal minimum wage that year (1990: from April 1)
const WAGE_HOURS_CAP = 8;              // a full workday of paid (work) hours per real day
const TIME_SPEED = 10;                 // on the computer a workday flies by: 1 real minute = 10 work minutes
const RANKS = [{ n: 0, name: 'Intern', x: 1 }, { n: 10, name: 'Assistant', x: 1.25 }, { n: 30, name: 'Manager', x: 1.5 }];
const BIZ = ['Pete\'s Pizza', 'Sunny Side Bakery', 'Maple Lane Hardware', 'Blue Moon Video', 'Rocket Car Wash', 'Happy Paws Pet Shop', 'Main Street Bikes', 'Corner Cafe'];
const PEOPLE = [['Mrs. Alvarez', 'alvarez'], ['Mr. Okafor', 'okafor'], ['Ms. Chen', 'chen'], ['Mr. Patel', 'patel'], ['Mrs. Novak', 'novak'], ['Coach Rivera', 'rivera']];
const WORDS = [['meeting', 'Tuesday'], ['delivery', 'Friday'], ['inventory', 'boxes'], ['party', 'balloons'], ['sale', 'coupons'], ['picnic', 'sandwiches']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const lc = s => String(s || '').toLowerCase();
// Each job: app (must run this year), event, pay, make(rnd) -> { title, text, check(data), params }.
const JOBS = [
  { id: 'memo', app: 'np', event: 'note-save', pay: 2, make: r => { const [a, b] = r.pick(WORDS), p = r.pick(PEOPLE); return { title: 'Type a memo', from: p, text: `Type a memo in Notepad for ${p[0]} about the ${a}. It must include the words "${a}" and "${b}". Then choose File, Save.`, check: d => lc(d.text).includes(lc(a)) && lc(d.text).includes(lc(b)) }; } },
  { id: 'edit', app: 'np', event: 'note-save', pay: 2, eras: ['1985'], make: r => { const [a, b] = r.pick(WORDS), p = r.pick(PEOPLE); return { title: 'Type a memo', from: p, text: `Type EDIT at the prompt and write a memo about the ${a}. Include "${a}" and "${b}", then save.`, check: d => lc(d.text).includes(lc(a)) && lc(d.text).includes(lc(b)) }; } },
  { id: 'list', app: 'np', event: 'note-save', pay: 2, make: r => { const b = r.pick(BIZ); return { title: 'Make a shopping list', from: ['The Boss', 'boss'], text: `${b} needs supplies. Write a shopping list with at least 6 lines in Notepad and save it.`, check: d => String(d.text || '').split('\n').filter(l => l.trim()).length >= 6 }; } },
  { id: 'logo', app: 'paint', event: 'paint-save', pay: 3, make: r => { const b = r.pick(BIZ); return { title: 'Draw a logo', from: ['Art Department', 'art'], text: `Draw a logo for ${b} in Paintbox using at least 3 colors, then choose File, Save picture.`, check: d => d.colors >= 3 && d.filled >= 0.04 }; } },
  { id: 'letter', app: 'write', event: 'write-save', pay: 4, make: r => { const p = r.pick(PEOPLE), b = r.pick(BIZ); return { title: 'Write a letter', from: p, text: `Write a thank-you letter from ${b} to ${p[0]} in the word processor. Make it at least 40 words, then save it.`, check: d => (d.words || String(d.text || '').split(/\s+/).filter(Boolean).length) >= 40 }; } },
  { id: 'cal', app: 'calendar', event: 'calendar-add', pay: 2, make: r => { const m = r.int(1, 12), dd = r.int(1, 28), [a] = r.pick(WORDS), p = r.pick(PEOPLE); return { title: 'Schedule an event', from: p, text: `Put the ${a} on the Calendar for ${MONTHS[m - 1]} ${dd}.`, check: d => +d.month === m && +d.day === dd }; } },
  { id: 'card', app: 'cardfile', event: 'cardfile-add', pay: 2, make: r => { const p = r.pick(PEOPLE); return { title: 'File a customer card', from: ['The Boss', 'boss'], text: `Add a Cardfile card for new customer ${p[0]}. Put their name on the card.`, check: d => lc((d.title || '') + ' ' + (d.text || '')).includes(lc(p[1])) }; } },
  { id: 'jingle', app: 'music', event: 'music-save', pay: 3, make: r => { const b = r.pick(BIZ); return { title: 'Compose a jingle', from: ['Radio Ads Dept.', 'radio'], text: `Compose a radio jingle for ${b} in Music Maker with at least 12 notes, then save it.`, check: d => d.notes >= 12 }; } },
  { id: 'site', app: 'pagebuilder', event: 'page-publish', pay: 5, make: r => { const b = r.pick(BIZ); return { title: 'Build a web page', from: ['Web Team', 'web'], text: `Publish a home page for ${b} with Home Page Builder. The page must mention "${b}".`, check: d => lc(d.text + ' ' + d.title).includes(lc(b.split(' ')[0])) }; } },
  { id: 'code', app: 'basic', event: 'basic-run', pay: 4, make: r => { const n = r.int(3, 6); return { title: 'Write a program', from: ['Computer Lab', 'lab'], text: `Write a BASIC program at least ${n} lines long and RUN it.`, check: d => d.lines >= n }; } },
  { id: 'sign', app: 'banner', event: 'banner-print', pay: 3, make: r => { const w = r.pick(['SALE', 'OPEN', 'WELCOME', 'PARTY', 'THANKS']), b = r.pick(BIZ); return { title: 'Print a sign', from: [b, 'shop'], text: `Print a sign or banner for ${b} that says ${w}.`, check: d => lc(d.text).includes(lc(w)) }; } },
  { id: 'ad', app: 'moviemaker', event: 'movie-save', pay: 5, make: r => { const b = r.pick(BIZ); return { title: 'Animate a TV ad', from: ['TV Ads Dept.', 'tv'], text: `Make a short animated ad for ${b} in Movie Maker, at least 8 frames long, and save it.`, check: d => d.frames >= 8 }; } },
  { id: 'type', app: 'critters', event: 'typing-done', pay: 3, make: r => { const w = r.pick([10, 12, 15]); return { title: 'Typing practice', from: ['Office Manager', 'office'], text: `Finish a typing lesson at ${w} words per minute or faster (Keyboard Critters or Type Rider).`, check: d => d.wpm >= w }; } },
  { id: 'invoice', app: 'calc', event: 'calc-result', pay: 2, make: r => { const a = r.int(3, 12), c = r.pick([1.25, 2.5, 3.75, 4.99, 6.5]), t = Math.round(a * c * 100) / 100; return { title: 'Figure an invoice', from: r.pick(PEOPLE), text: `A customer bought ${a} items at $${c.toFixed(2)} each. Work out the total on the Calculator.`, check: d => Math.abs(+d.value - t) < 0.006 }; } },
  { id: 'books', app: 'sheet', event: 'sheet-save', pay: 4, make: r => { const xs = Array.from({ length: 5 }, () => r.int(8, 60)), t = xs.reduce((a, b) => a + b, 0); return { title: 'Keep the books', from: ['Bookkeeping', 'books'], text: `Type this week's sales into Horizon Sheet (${xs.join(', ')}) in a column, add a =SUM formula for the total, and save.`, check: d => Object.values(d.cells || {}).some(c => /sum\(/i.test(c)) && Object.values(d.values || {}).some(v => +v === t) }; } },
  { id: 'reply', app: 'mail', event: 'mail-send', pay: 3, mail: true, make: (r, id) => { const p = r.pick(PEOPLE), b = r.pick(BIZ); return { title: 'Answer a customer', from: p, text: `${p[0]} emailed ${b} a question. Open Mail, reply to the message and answer politely (at least a sentence).`, subject: 'Question about my order', body: `Hello,\n\nI ordered from ${b} last week. Can you tell me when it will be ready?\n\nThanks,\n${p[0]}`, check: d => d.replyTo === id && String(d.body || '').trim().length >= 20 }; } },
  { id: 'email', app: 'mail', event: 'mail-send', pay: 3, mail: true, make: r => { const p = r.pick(PEOPLE), a = r.int(3, 9), c = r.pick([2, 4, 5]), t = a * c; return { title: 'Email a total', from: ['The Boss', 'boss'], text: `Email ${p[0]} (${p[1]}@prairienet.com) the total for ${a} boxes at $${c} each. Put the number in the message.`, subject: 'Please send the total', body: `Hi,\n\nPlease email ${p[0]} at ${p[1]}@prairienet.com the total for ${a} boxes at $${c} each.\n\nThanks!`, check: d => lc(d.to).includes(p[1]) && String(d.body || '').replace(/,/g, '').includes(String(t)) }; } },
  { id: 'snap', app: 'photo', event: 'photo-save', pay: 4, make: r => { const s = r.pick(['giraffe', 'penguin', 'surfer', 'lighthouse', 'taxi', 'dog', 'kite', 'cow', 'rocket', 'astronaut']); return { title: 'Newspaper photo', from: ['Gazette Photo Desk', 'gazette'], text: `The Gazette needs a clear photo of a ${s}. Take one with Photo Studio and save it to the album.`, check: d => (d.subjects || []).includes(s) && d.quality >= 0.5 }; } },
  { id: 'poster', app: 'kidart', event: 'art-save', pay: 3, make: r => { const b = r.pick(BIZ); return { title: 'Make a poster', from: [b, 'shop'], text: `Make a colorful poster for ${b} in Splatter Pad (at least 4 colors) and save it.`, check: d => d.colors >= 4 }; } }
];
function seeded(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; const next = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; return { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: a => a[Math.floor(next() * a.length)] }; }
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const workGet = (k, d) => store.get('work:' + k, d), workSet = (k, v) => store.set('work:' + k, v);
function todaysJobs() {
  const key = today() + ':' + era.id, r = seeded(key), have = new Set(apps().map(a => a.id)), done = workGet('done:' + key, {});
  const pool = JOBS.filter(j => have.has(j.app) && (!j.eras || j.eras.includes(era.id)) && !(j.id === 'memo' && era.id === '1985'));
  const picked = []; const used = new Set();
  while (picked.length < 3 && used.size < pool.length) { const j = r.pick(pool); if (used.has(j.id)) { used.add(j.id); continue; } used.add(j.id); if (picked.some(p => p.app === j.app) && pool.length > 4) continue; picked.push(j); }
  return picked.map(j => {
    const id = key + ':' + j.id, m = j.make(seeded(id), id), pay = Math.round(j.pay * rank().x * 100) / 100;
    return { id, title: m.title, pay, app: j.app, event: j.event, done: !!done[id], instructions: m.text, from: { name: m.from[0], addr: m.from[1] + '@horizon-temps.com' }, mail: m.subject ? { subject: m.subject, body: m.body } : ((era.id === '1995' || era.id === '2000') ? { subject: 'New assignment: ' + m.title, body: m.text + '\n\nThanks,\n' + m.from[0] } : null), check: m.check };
  });
}
const rank = () => { const n = workGet('jobsDone', 0); return RANKS.slice().reverse().find(x => n >= x.n); };
function workTask(type, data) {
  if (!booted) return;
  const key = today() + ':' + era.id, done = workGet('done:' + key, {});
  todaysJobs().forEach(j => {
    if (j.done || j.event !== type) return;
    let ok = false; try { ok = !!j.check(data); } catch (e) {}
    if (!ok) return;
    done[j.id] = true; workSet('done:' + key, done);
    const un = workGet('unpaid', { jobs: [], wage: 0, secs: 0, bonus: 0 }); un.jobs.push({ t: j.title, pay: j.pay, y: era.year }); workSet('unpaid', un);
    workSet('jobsDone', workGet('jobsDone', 0) + 1);
    sfx.tada(); toast(`Job done: ${j.title}! +${money(j.pay)} on your next paycheck.`);
    if (todaysJobs().every(x => x.done)) workDayDone();
    if (wins.work && wins.work.refresh) wins.work.refresh();
  });
}
// Finishing all of a year's jobs for the day builds a streak: $1 extra per day in a row (up to $5).
function workDayDone() {
  const st = workGet('streak', { last: '', n: 0 }), t = today();
  if (st.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  st.n = st.last === y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate() ? st.n + 1 : 1; st.last = t; workSet('streak', st);
  const bonus = Math.min(5, st.n), un = workGet('unpaid', { jobs: [], wage: 0, secs: 0, bonus: 0 }); un.bonus = (un.bonus || 0) + bonus; workSet('unpaid', un);
  setTimeout(() => toast(`All of today's jobs done! ${st.n}-day streak: +${money(bonus)} bonus.`), 1500);
}
// Time clock: while clocked in, each active minute (mouse, keys or taps in the last minute; no screen saver) earns that year's minimum wage.
let lastInput = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
document.addEventListener('pointermove', () => { lastInput = Date.now(); }, { passive: true });
setInterval(() => {
  const c = workGet('clock', { on: false });
  if (!c.on || !booted || saverOn || document.hidden || Date.now() - lastInput > 60000) return;
  const t = today(), day = workGet('hours', { day: t, secs: 0 }); if (day.day !== t) { day.day = t; day.secs = 0; }
  if (day.secs >= WAGE_HOURS_CAP * 3600) { if (!c.capped) { c.capped = true; workSet('clock', c); toast(`That's a full ${WAGE_HOURS_CAP}-hour shift today. Great work! The time clock stops paying until tomorrow.`); } return; }
  const ws = 15 * TIME_SPEED; day.secs += ws; workSet('hours', day);
  const un = workGet('unpaid', { jobs: [], wage: 0, secs: 0, bonus: 0 }); un.secs = (un.secs || 0) + ws; un.wage = (un.wage || 0) + (MIN_WAGE[era.id] || 4) * ws / 3600; workSet('unpaid', un);
  if (wins.work && wins.work.refresh && wins.work.clockOnly) wins.work.clockOnly();
}, 15000);
const fmtHM = s => `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}`;
function payday() {
  const un = workGet('unpaid', { jobs: [], wage: 0, secs: 0, bonus: 0 });
  const wage = Math.floor((un.wage || 0) * 100) / 100, jobs = un.jobs.reduce((a, j) => a + j.pay, 0), total = Math.round((wage + jobs + (un.bonus || 0)) * 100) / 100;
  if (total <= 0) { msgBox('Payday', 'Nothing to collect yet. Finish a job or clock in and work a while first!'); return; }
  setWallet(wallet() + total); workSet('earned', workGet('earned', 0) + total);
  workSet('unpaid', { jobs: [], wage: Math.max(0, (un.wage || 0) - wage), secs: 0, bonus: 0 });
  const row = (label, amt) => label.padEnd(30, '.') + money(amt).padStart(9);
  const out = [`HORIZON TEMP AGENCY - PAY STUB`, `Employee: ${store.get('user', 'kidsurfer')}  (${rank().name})`, ''];
  un.jobs.forEach(j => out.push(row(`${j.t} (${j.y}) `, j.pay)));
  if (un.secs) out.push(row(`Time clock ${fmtHM(un.secs)} hrs `, wage));
  if (un.bonus) out.push(row('Streak bonus ', un.bonus));
  out.push('', row('TOTAL PAID ', total), '', 'Added to your money. Spend it wisely!');
  sfx.tada();
  openWin({ id: 'paystub', title: 'Paycheck', icon: 'work', w: 420, center: true, fixed: true, noMin: true, autoH: true, build(W) {
    W.body.innerHTML = '<div class="wk-stub"><pre></pre><div class="btns"><button class="btn">OK</button></div></div>';
    W.body.querySelector('pre').textContent = out.join('\n'); W.body.querySelector('button').onclick = () => closeWin(W);
  }});
  if (wins.store && wins.store.refresh) wins.store.refresh();
  if (wins.work && wins.work.refresh) wins.work.refresh();
}
function openWork() {
  return openWin({ id: 'work', title: era.year < 1995 ? 'Job Board' : 'Job Center', icon: 'work', w: 620, h: 500, build(W) {
    W.refresh = () => {
      const jobs = todaysJobs(), c = workGet('clock', { on: false }), un = workGet('unpaid', { jobs: [], wage: 0, secs: 0, bonus: 0 }), st = workGet('streak', { last: '', n: 0 }), hrs = workGet('hours', { day: today(), secs: 0 }), rk = rank(), nx = RANKS.find(x => x.n > workGet('jobsDone', 0));
      const owed = Math.floor((un.wage || 0) * 100) / 100 + un.jobs.reduce((a, j) => a + j.pay, 0) + (un.bonus || 0);
      W.body.innerHTML = `<div class="wk"><div class="wk-hd"><div><b>HORIZON TEMP AGENCY</b><small>${esc(store.get('user', 'kidsurfer'))} · ${rk.name}${nx ? ` (${nx.n - workGet('jobsDone', 0)} more jobs to ${nx.name})` : ''} · Job streak: ${st.n} · Visit streak: ${store.get('visitStreak', { n: 0 }).n} day${store.get('visitStreak', { n: 0 }).n === 1 ? '' : 's'}</small></div><div class="wk-owed">On your next paycheck<b>${money(owed)}</b><button class="btn" data-pay>Collect paycheck</button></div></div>
        <h4>Today's assignments (${era.year})</h4>${jobs.length ? jobs.map(j => `<div class="wk-job${j.done ? ' done' : ''}" data-app="${j.app}"><div><b>${esc(j.title)}</b> <small>from ${esc(j.from.name)}</small><p>${esc(j.instructions)}</p></div><div class="wk-pay">${money(j.pay)}${j.done ? '<span>DONE</span>' : `<button class="btn" data-open>${j.app === 'mail' ? 'Open Mail' : 'Start'}</button>`}</div></div>`).join('') : '<p>No jobs today on this computer. Try another year!</p>'}
        <p class="wk-note">New jobs every day in every year. Finish all three for a streak bonus. Each year has its own assignments.</p>
        <h4>Time clock</h4><div class="wk-clock"><span class="wk-lamp${c.on ? ' on' : ''}"></span><div><b data-clk>${c.on ? 'Clocked in' : 'Clocked out'}</b><small>Pay: ${money(MIN_WAGE[era.id] || 4)} an hour, the real US minimum wage in ${era.year}. Time counts only while you're using the computer, and it flies: 1 real minute = ${TIME_SPEED} work minutes, so an ${WAGE_HOURS_CAP}-hour shift takes ${WAGE_HOURS_CAP * 60 / TIME_SPEED} real minutes (one paid shift a day).</small><small data-hrs>Paid time today: ${fmtHM(hrs.day === today() ? hrs.secs : 0)} of ${WAGE_HOURS_CAP}:00</small></div><button class="btn" data-clock>${c.on ? 'Clock out' : 'Clock in'}</button></div>
        <p class="wk-note">Total earned working: ${money(workGet('earned', 0))} · Jobs finished: ${workGet('jobsDone', 0)}</p></div>`;
      W.body.querySelector('[data-pay]').onclick = payday;
      W.body.querySelector('[data-clock]').onclick = () => { const k = workGet('clock', { on: false }); k.on = !k.on; k.capped = false; workSet('clock', k); sfx.click(); toast(k.on ? `Clocked in at ${money(MIN_WAGE[era.id] || 4)} an hour.` : 'Clocked out. Collect your paycheck any time.'); W.refresh(); };
      $$('[data-open]', W.body).forEach(b => b.onclick = () => openApp(b.closest('[data-app]').dataset.app));
    };
    W.clockOnly = () => { const h = W.body.querySelector('[data-hrs]'), hrs = workGet('hours', { day: today(), secs: 0 }); if (h) h.textContent = `Paid time today: ${fmtHM(hrs.day === today() ? hrs.secs : 0)} of ${WAGE_HOURS_CAP}:00`; };
    W.refresh();
  }});
}

/* play money */
const WALLET_START = 60, ALLOWANCE = 10, DAILY_EARN_CAP = 60;
const wallet = () => store.get('wallet', WALLET_START);
const setWallet = v => store.set('wallet', Math.round(v * 100) / 100);
const money = v => '$' + Number(v).toFixed(2);
/* Tester mode (ARCHIVED): ?tester used to give unlimited money in this browser. It's switched off now that
   store coupon codes exist (see COUPON_HASHES). Set TESTER_MODE_ENABLED = true to bring it back.
   While off, ?tester does nothing and anyone still in tester mode is switched out (games kept, money back to $60). */
const TESTER_MODE_ENABLED = false;
const tester = () => TESTER_MODE_ENABLED && store.get('tester', false);
(() => {
  if (!TESTER_MODE_ENABLED && store.get('tester', false)) leaveTester(true);
  const m = location.search.match(/[?&]tester(?:=([^&]*))?/i); if (!m) return;
  if ((m[1] || '').toLowerCase() === 'off') leaveTester(true); else if (TESTER_MODE_ENABLED) store.set('tester', true);
  try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])tester(=[^&]*)?&?/i, '$1').replace(/[?&]$/, '') + location.hash); } catch (e) {}
})();
function leaveTester(keepGames) {
  store.set('tester', false); setWallet(WALLET_START);
  if (!keepGames) { store.set('owned', []); store.set('pending', []); }
  if (typeof wins !== 'undefined' && wins.store && wins.store.refresh) wins.store.refresh();
}
function installAll() {
  const ids = Object.values(PLUGINS).filter(p => p.kind === 'store').map(p => p.id);
  store.set('owned', [...new Set([...owned(), ...ids])]); store.set('pending', []);
  refreshShell(); if (wins.store && wins.store.refresh) wins.store.refresh();
  toast(`Installed all ${ids.length} store games (tester mode).`);
}
function earn(amt, why) {
  const day = new Date().toDateString(), log = store.get('earnLog', { day, n: 0 });
  if (log.day !== day) { log.day = day; log.n = 0; }
  if (tester()) { toast(`+${money(amt)}${why ? ' for ' + why : ''} (tester mode: money is unlimited)`); return amt; }
  const give = Math.max(0, Math.min(amt, DAILY_EARN_CAP - log.n));
  if (!give) return 0;
  log.n += give; store.set('earnLog', log); setWallet(wallet() + give);
  toast(`+${money(give)}${why ? ' for ' + why : ''}`);
  if (wins.store && wins.store.refresh) wins.store.refresh();
  return give;
}
function allowance() {
  const day = new Date().toDateString();
  if (store.get('allowanceDay', '') === day || tester()) return;
  const first = store.get('allowanceDay', '') === '';
  store.set('allowanceDay', day);
  // Showing up every day builds a visit streak: +$1 per day in a row on top of the allowance (up to +$7).
  const y = new Date(); y.setDate(y.getDate() - 1);
  const vs = store.get('visitStreak', { last: '', n: 0 }); vs.n = vs.last === y.toDateString() ? vs.n + 1 : 1; vs.last = day; store.set('visitStreak', vs);
  const extra = first ? 0 : Math.min(7, vs.n - 1);
  if (!first) { setWallet(wallet() + ALLOWANCE + extra); setTimeout(() => toast(`+${money(ALLOWANCE)} allowance${extra ? ` and +${money(extra)} for a ${vs.n}-day visit streak` : ''}. Spend it at the Software Store!`), 1500); }
}
// Read text aloud for young players (Web Speech API). Silent if unsupported or the volume is at zero.
function say(text, o = {}) {
  try {
    if (!window.speechSynthesis || settings.vol <= 0) return false;
    if (o.interrupt !== false) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = o.rate || 1; u.pitch = o.pitch || 1.1; u.volume = Math.min(1, settings.vol * 1.4);
    speechSynthesis.speak(u); return true;
  } catch (e) { return false; }
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
      { label: 'Help', items: [{ label: 'Quick Help', fn: () => openHelp() }, { label: 'Read Me First', fn: () => openNotepad('README.TXT') }, { label: 'About ' + era.os.name, fn: aboutOS }] }
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
  const desk = ['files', ...era.apps.filter(id => APP_DEFS[id]().cat === 'main' && id !== 'cp'), 'store', 'work', 'passport', 'help'];
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
  add('folder', 'Programs', null, () => apps().filter(a => a.cat !== 'game' && !['cp', 'readme', 'help'].includes(a.id)));
  add('mines', 'Games', null, () => groupApps('game').concat([{ label: 'Get more games…', icon: 'shop', open: () => openStore() }]));
  items.appendChild(document.createElement('hr'));
  add('cp', 'Control Panel', openSettings);
  add('info', 'Quick Help', () => openHelp());
  add('note', 'Read Me First', () => openNotepad('README.TXT'));
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
    function save() { store.set('mynotes', ta.value); taskEvent('note-save', { text: ta.value }); sfx.seek(6); msgBox('Notepad', 'MYNOTES.TXT has been saved to drive C:.'); }
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
/* Extra fake-web pages live in js/web/*.js and register on window.RETRO_SITES:
   { eras: ['1995', '2000'] or '*', url: 'http://…/' or match: url => bool, page: (url, h) => ({ title, cls, blocks, after }),
     search: [{ title, url, desc, keywords }] }  (search entries feed each year's search engine through h.search) */
const SITES = window.RETRO_SITES || [];
const SHARE_URL = 'http://www.cyberburbs.com/shared/'; // where a shared home page (#year&page=…) is shown
const siteOn = s => s.eras === '*' || (s.eras || []).includes(era.id);
function sitePage(url) {
  for (const s of SITES) if (siteOn(s) && (s.url ? s.url === url : s.match && s.match(url))) return s.page(url, H);
  return null;
}
function siteSearch(q) {
  const words = String(q).toLowerCase().split(/\W+/).filter(w => w.length > 1);
  const out = [];
  SITES.filter(siteOn).forEach(s => (s.search || []).forEach(e => {
    const hay = (e.title + ' ' + (e.desc || '') + ' ' + (e.keywords || '')).toLowerCase();
    const n = words.filter(w => hay.includes(w)).length;
    if (n) out.push(Object.assign({ score: n }, e));
  }));
  return out.sort((a, b) => b.score - a.score);
}
// URL hash: #1995 or #1995&page=… (extra params are passed to pages, e.g. a shared home page)
const HASH = (() => { const parts = location.hash.replace(/^#/, '').split('&'), o = { era: parts.shift() }; parts.forEach(p => { const i = p.indexOf('='); if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); }); return o; })();
const H = { search: siteSearch, param: k => HASH[k], appLoad: (app, k, d) => store.get('app:' + app + ':' + k, d), era: () => ({ id: era.id, year: era.year }), A, APP: APPLINK, esc, store: estore, NEWGIF, CONSTRUCTION, rateKB, fmtTime, fmtBps, effBps, dlTable, bindDownloads, gb, playMusic, stopMusic, msgBox, openApp, get sites() { return era.sites; }, get user() { return store.get('user', 'kidsurfer'); }, conn };

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

function openBrowser(startUrl) {
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
      const P = sitePage(url) || era.page(url, H);
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
    setTimeout(() => nav(startUrl || era.sites.home), 50);
  }});
  if (startUrl && W.nav && W._built) W.nav(startUrl);
  W._built = true;
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
  '1985': { name: 'Cardinal Software Catalog', sub: 'Order by mail. Programs arrive on 5¼" floppy disks in about 4 to 6 weeks. (Here, a little faster.)' },
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
      W.body.innerHTML = `<div class="shop"><div class="shop-hd"><div><b>${esc(S.name)}</b><small>${esc(S.sub)}</small></div><div class="shop-wallet">${tester() ? `Tester mode<b>Unlimited</b><small><button class="btn" data-all>Install all games</button></small>` : `Your money<b>${money(wallet())}</b><small>Win games and get a ${money(ALLOWANCE)} allowance every day you visit</small>`}<small><button class="btn co-open" data-coupon>${allAccess() ? 'All access' : 'Coupon code…'}</button></small></div></div>
        <div class="shop-list">${now.map(p => {
          const own = isOwned(p.id), paid = store.get('pending', []).includes(p.id);
          const act = own ? `<span class="own">✔ Installed</span><button class="btn" data-play>Play</button>` : paid ? `<span class="own">Paid</span><button class="btn" data-inst>Install</button>` : `<span class="price">${money(p.price)}</span><button class="btn" data-buy>Buy</button>`;
          return `<div class="shop-item${p.id === focusId ? ' hi' : ''}" data-id="${p.id}">${boxArt(p)}<div class="shop-txt"><b>${esc(p.label)}</b><small>${esc(p.publisher || '')} · ${p.year} · ${esc(p.genre || 'Game')}</small><p>${esc(p.blurb || '')}</p><div class="shop-buy">${act}</div></div></div>`;
        }).join('') || '<p>No titles yet. Check back soon!</p>'}</div>
        ${later.length ? `<div class="shop-later"><b>Coming in the future:</b> ${later.map(p => `${esc(p.label)} <small>(needs ${reqOS(p.year)})</small>`).join(', ')}</div>` : ''}</div>`;
      $$('[data-buy]', W.body).forEach(b => b.onclick = () => buy(b.closest('[data-id]').dataset.id));
      const allB = W.body.querySelector('[data-all]'); if (allB) allB.onclick = installAll;
      const coB = W.body.querySelector('[data-coupon]'); if (coB) coB.onclick = () => openCheckout(null);
      $$('[data-play]', W.body).forEach(b => b.onclick = () => launchApp(b.closest('[data-id]').dataset.id));
      $$('[data-inst]', W.body).forEach(b => b.onclick = () => install(PLUGINS[b.closest('[data-id]').dataset.id]));
      const hi = W.body.querySelector('.shop-item.hi'); if (hi) hi.scrollIntoView({ block: 'nearest' });
    };
    W.refresh();
  }});
  if (focusId && W.refresh) W.refresh();
  return W;
}
/* ---------- Coupon codes (Software Store checkout) ----------
   Only a SHA-256 fingerprint of each code lives here, never the code itself, so reading this file doesn't reveal it.
   A valid code gives this browser "all access": every store game is free and installed, including future ones.
   To add a code: sha256('retroputer-coupon-v1:' + CODE_WITHOUT_DASHES_UPPERCASE) and append the hex below. */
const COUPON_HASHES = ['7a7bad30fcecdbc4756465b4d170d2a59417185e05a9f4465313eb915d100576'];
const allAccess = () => store.get('allAccess', false) === true;
function sha256hex(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(str)), bitLen = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bitLen >>> (i * 8)) & 255);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
// Returns 'ok', 'bad' or 'wait' (too many wrong tries: a one-minute pause).
function tryCoupon(input) {
  let tries = {}; try { tries = JSON.parse(sessionStorage.getItem('r1990:couponTries') || '{}'); } catch (e) {}
  if (tries.until && Date.now() < tries.until) return 'wait';
  const norm = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (norm && COUPON_HASHES.includes(sha256hex('retroputer-coupon-v1:' + norm))) {
    store.set('allAccess', true);
    const ids = Object.values(PLUGINS).filter(p => p.kind === 'store').map(p => p.id);
    store.set('owned', [...new Set([...store.get('owned', []), ...ids])]); store.set('pending', []);
    try { sessionStorage.removeItem('r1990:couponTries'); } catch (e) {}
    refreshShell(); if (wins.store && wins.store.refresh) wins.store.refresh();
    sfx.tada(); return 'ok';
  }
  tries.n = (tries.n || 0) + 1; if (tries.n >= 5) { tries.n = 0; tries.until = Date.now() + 60000; }
  try { sessionStorage.setItem('r1990:couponTries', JSON.stringify(tries)); } catch (e) {}
  return 'bad';
}
// Checkout: the item, its price, a coupon box, and Buy / Cancel. Without an item it's just the coupon box.
function openCheckout(p) {
  return openWin({ id: 'checkout', title: p ? 'Checkout' : 'Coupon code', icon: 'shop', w: 380, center: true, fixed: true, noMin: true, autoH: true, build(W) {
    const draw = () => {
      const free = tester() || allAccess(), short = p && !free && wallet() < p.price;
      W.body.innerHTML = `<div class="dlg co">${p ? `<p><b>${esc(p.label)}</b><br>Price: ${free ? '<s>' + money(p.price) + '</s> <b>FREE</b>' : money(p.price)}${free ? '' : `<br>Your money: ${money(wallet())}${short ? ' <b class="co-short">(not enough)</b>' : ''}`}</p>` : ''}
        ${allAccess() ? '<p class="co-ok">Coupon active: every game is free for you.</p>' : `<label class="co-lab">Coupon code<div class="co-row"><input class="co-in" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"><button class="btn" data-apply>Apply</button></div></label><div class="co-msg" role="status"></div>`}
        <div class="btns">${p ? `<button class="btn" data-buy${short ? ' disabled' : ''}>${free ? 'Install' : 'Buy it'}</button>` : ''}<button class="btn" data-x>${p ? 'Cancel' : 'Close'}</button></div></div>`;
      const inp = W.body.querySelector('.co-in'), msg = W.body.querySelector('.co-msg');
      const apply = () => {
        const r = tryCoupon(inp.value);
        if (r === 'ok') { draw(); toast('Coupon accepted! Every store game is now free and installed.'); if (!p) setTimeout(() => closeWin(W), 1600); }
        else { msg.textContent = r === 'wait' ? 'Too many tries. Wait a minute and try again.' : "That code didn't work. Check it and try again."; sfx.ding(); }
      };
      if (inp) { W.body.querySelector('[data-apply]').onclick = apply; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }; }
      const b = W.body.querySelector('[data-buy]');
      if (b) b.onclick = () => { closeWin(W); completePurchase(p); };
      W.body.querySelector('[data-x]').onclick = () => closeWin(W);
      if (short) msg && !msg.textContent && (msg.textContent = 'Win free games or wait for your daily allowance to earn more, or enter a coupon code.');
    };
    draw();
  }});
}
function buy(id) {
  const p = PLUGINS[id]; if (!p || isOwned(id)) return;
  openCheckout(p);
}
function completePurchase(p) {
  if (isOwned(p.id)) return;
  const free = tester() || allAccess();
  if (!free && wallet() < p.price) return;
  if (!free) setWallet(wallet() - p.price);
  store.set('pending', [...new Set([...store.get('pending', []), p.id])]);
  if (wins.store && wins.store.refresh) wins.store.refresh();
  install(p);
}
function install(p) {
  const media = era.id === '1990' || era.id === '1985' ? 'floppy' : era.id === '1995' || !net.connected ? 'cd' : 'download';
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
        const disk = era.id === '1985' ? 360 : 1440, n = Math.max(1, Math.min(4, Math.ceil(kb / disk)));
        what.textContent = `${n} floppy disk${n > 1 ? 's' : ''}, ${era.id === '1985' ? '5¼" 360 KB' : '3½" high density'}`;
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
const DISK = { '1985': 10, '1990': 80, '1995': 850, '2000': 20480 };
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
// A save file is plain JSON: { format, version, savedAt, user, data: { 'r1990:...': '...' } }.
const SAVE_FORMAT = 'retroputer-save';
function saveFileBlob() {
  const body = JSON.stringify({ format: SAVE_FORMAT, version: 1, savedAt: new Date().toISOString(), user: store.get('user', 'kidsurfer'), data: allSaved() });
  const d = new Date(), name = `RetroPuter-save-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  return { body, name, blob: new Blob([body], { type: 'application/json' }) };
}
// Accepts a save file's text or an old-style backup code; returns the r1990: keys, or null.
function parseBackup(text) {
  text = String(text || '').trim(); let data = null;
  try { const j = JSON.parse(text); data = j && j.format === SAVE_FORMAT ? j.data : j; } catch (e) {
    try { data = JSON.parse(decodeURIComponent(escape(atob(text)))); } catch (e2) { return null; }
  }
  if (!data || typeof data !== 'object') return null;
  const keys = Object.keys(data).filter(k => k.startsWith('r1990:') && typeof data[k] === 'string');
  return keys.length ? Object.fromEntries(keys.map(k => [k, data[k]])) : null;
}
async function applyBackup(data, from) {
  if (!data) { msgBox('Restore', `That ${from} doesn't look like a RetroPuter save. Make sure it's the whole thing and try again.`, ['OK'], 'warn'); return; }
  const r = await msgBox('Restore', 'This replaces everything saved in this browser with the save you picked. Continue?', ['Restore', 'Cancel'], 'warn');
  if (r !== 'Restore') return;
  try { Object.keys(allSaved()).forEach(k => localStorage.removeItem(k)); Object.keys(data).forEach(k => localStorage.setItem(k, data[k])); } catch (e) { msgBox('Restore', 'This browser ran out of room while restoring. Try a different browser.', ['OK'], 'stop'); return; }
  location.reload();
}
function openBackup() {
  openWin({ id: 'backup', title: 'Backup & Restore', icon: 'cp', w: 460, fixed: true, autoH: true, build(W) {
    const f = saveFileBlob(), kb = Math.max(1, Math.round(f.body.length / 1024));
    const canShare = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([f.blob], f.name, { type: 'application/json' })] })); } catch (e) { return false; } })();
    const last = store.get('lastBackup', '');
    let code = ''; try { code = btoa(unescape(encodeURIComponent(JSON.stringify(allSaved())))); } catch (e) {}
    W.body.innerHTML = `<div class="cp bk"><p>Everything (games, money, notes, pictures, scores) is saved in <b>this browser only</b>. No account needed. To keep it safe or move it to another computer or phone, save it to a file.</p>
      <fieldset><legend>Save my progress</legend>
        <div class="bk-row"><button class="btn" data-save>Save to file (${kb} KB)</button>${canShare ? '<button class="btn" data-share>Send to my other device…</button>' : ''}</div>
        <small>${last ? 'Last saved to a file: ' + esc(new Date(last).toLocaleString()) + '.' : 'Not saved to a file yet.'} Clearing your browser's site data, private windows, and Safari after 7 days without a visit all erase progress, so save a file now and then.</small>
      </fieldset>
      <fieldset><legend>Load progress</legend>
        <div class="bk-row"><button class="btn" data-load>Load from file…</button><input type="file" accept=".json,application/json,text/plain" data-file hidden></div>
        <small>On the other device, open RetroPuter, go to Control Panel, Backup &amp; Restore, and load the file. It replaces what's there.</small>
      </fieldset>
      <details class="bk-code"><summary>Use a backup code instead (copy and paste)</summary>
        <textarea rows="4" readonly data-code></textarea><div class="bk-row"><button class="btn" data-copy>Copy code</button></div>
        <textarea rows="3" data-in placeholder="Paste a backup code here"></textarea><div class="bk-row"><button class="btn" data-restore>Restore from code</button></div>
      </details>
      <div style="text-align:right"><button class="btn" data-ok>Close</button></div></div>`;
    const mark = () => store.set('lastBackup', Date.now());
    W.body.querySelector('[data-save]').onclick = () => {
      const g = saveFileBlob(), url = URL.createObjectURL(g.blob), a = document.createElement('a');
      a.href = url; a.download = g.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      mark(); sfx.seek(6); toast(`Saved ${g.name}. Keep it somewhere safe!`);
    };
    const sh = W.body.querySelector('[data-share]');
    if (sh) sh.onclick = async () => {
      const g = saveFileBlob();
      try { await navigator.share({ files: [new File([g.blob], g.name, { type: 'application/json' })], title: 'My RetroPuter save', text: 'Open RetroPuter, go to Control Panel, Backup & Restore, and choose Load from file.' }); mark(); toast('Save sent!'); }
      catch (e) { if (e && e.name !== 'AbortError') msgBox('Send', "Sharing didn't work here. Use Save to file instead.", ['OK'], 'warn'); }
    };
    const fileIn = W.body.querySelector('[data-file]');
    W.body.querySelector('[data-load]').onclick = () => fileIn.click();
    fileIn.onchange = () => { const file = fileIn.files && fileIn.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => applyBackup(parseBackup(rd.result), 'file'); rd.readAsText(file); fileIn.value = ''; };
    const ta = W.body.querySelector('[data-code]'); ta.value = code;
    W.body.querySelector('[data-copy]').onclick = async e => { ta.select(); try { await navigator.clipboard.writeText(code); e.target.textContent = 'Copied!'; } catch (err) { document.execCommand && document.execCommand('copy'); e.target.textContent = 'Selected, press Ctrl+C'; } mark(); };
    W.body.querySelector('[data-restore]').onclick = () => applyBackup(parseBackup(W.body.querySelector('[data-in]').value), 'code');
    W.body.querySelector('[data-ok]').onclick = () => closeWin(W);
  }});
}
async function eraseAll() {
  const r = await msgBox('Erase hard drive', 'This deletes everything: purchased games, money, notes, high scores and guestbook entries. It can\'t be undone (unless you saved a save file or backup code).\n\nErase everything?', ['Erase', 'Cancel'], 'stop');
  if (r !== 'Erase') return;
  try { Object.keys(allSaved()).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  location.reload();
}

/* --- settings --- */
/* ---------- Quick Help: the guide that opens the first time you use each year ---------- */
// The program list is built from the live app registry, so new apps show up on their own. Each app's one-line
// description is its `help` field (store games fall back to `tagline`). Core programs are described here.
// When a year gets a new shell, feature or way to earn money, update the pages in openHelp() too.
const CORE_HELP = {
  dial: 'Connects the modem so you can go online. Listen for the screech!',
  nv: 'Surf the pretend Web of this year: search, news, games, home pages and downloads.',
  chat: 'Hang out in a chat room with pretend buddies.',
  im: 'Send instant messages to pretend buddies.',
  jb: 'Play music, including songs you download from the Web.',
  readme: 'A longer tour of this computer and what was new in this year.',
  mines: 'Find the hidden mines without stepping on one. Win to earn money.',
  worm: 'Steer the worm to the food and don\'t hit a wall. High scores earn money.',
  paint: 'Draw pictures with brushes, shapes and a paint bucket.',
  np: 'Type notes. Save them and they\'ll still be here next time.',
  cp: 'Sound, screen color, screen savers, backups and the Time Machine.',
  store: 'Buy new games with your play money.',
  files: 'Look around the hard disk, including files you download.',
  help: 'This guide.',
  work: 'Do daily jobs and clock in for an hourly wage. Collect your paycheck to earn money.',
  passport: 'Collect a stamp for each year\'s big moments. Fill it for a bonus.',
  capsule: 'Write a message and bury it. It opens when you visit a later year.'
};
const helpLine = a => { const p = PLUGINS[a.id]; return (p && (p.help || p.tagline)) || CORE_HELP[a.id] || ''; };
function openHelp(page) {
  const Y = era.year, S = storeInfo(), dos = era.shell === 'dos', start = era.shell === 'start';
  const tap = 'Double-click (or tap once on a phone or tablet)';
  const has = id => !!findApp(id);
  const li = items => '<ul>' + items.filter(Boolean).map(t => `<li>${t}</li>`).join('') + '</ul>';
  const listApps = (title, list) => list.length ? `<h4>${esc(title)}</h4><dl>${list.map(a => `<dt>${ICONS[a.icon] || ''}<b>${esc(a.label)}</b>${dos ? ` <code>${esc(dosCmd(a))}</code>` : ''}</dt><dd>${esc(helpLine(a))}</dd>`).join('')}</dl>` : '';
  const pages = () => {
    const all = apps(), mine = all.filter(a => !['help', 'readme'].includes(a.id));
    const forSale = Object.values(PLUGINS).filter(p => p.kind === 'store' && p.year <= Y && !isOwned(p.id));
    const later = Object.values(PLUGINS).filter(p => p.kind === 'store' && p.year > Y).length;
    const out = [];
    out.push({ t: `Welcome to ${Y}!`, h: `<p class="qh-big">You're sitting at a computer from <b>${Y}</b> running <b>${esc(era.os.name)}</b>. Everything here is pretend, so explore all you like. You can't break it.</p>
      <p>${esc(era.power)}</p>
      <h4>What you're looking at</h4>` + (dos
        ? li(['A black screen with a blinking <code>C:\\&gt;</code> prompt. That\'s the whole computer: no mouse, no pictures.', 'You <b>type a command and press Enter</b>. Type <code>HELP</code> to see them all.', 'The bar at the bottom has buttons for people who\'d rather not type: <b>HELP</b>, <b>PROGRAMS</b>, <b>FILES</b>, <b>TIME MACHINE</b> and <b>OFF</b>.'])
        : start
          ? li(['<b>Icons</b> on the desktop open programs.', 'The <b>Start</b> button (bottom left) has every program, Games, Control Panel and Shut Down.', 'The <b>taskbar</b> along the bottom shows your open windows. Click one to bring it back.', `The <b>${Y}</b> button and the clock sit at the bottom right. The ${Y} button is the Time Machine.`])
          : li(['<b>Program Manager</b> is the big window. Its icons open programs.', 'The <b>Accessories</b> and <b>Games</b> icons open groups with more programs inside.', 'The bar along the bottom shows your open windows, the <b>' + Y + '</b> button (the Time Machine), the clock and <b>Shut Down</b>.']))
    });
    out.push({ t: 'Getting around', h: (dos
      ? `<h4>Typing commands</h4>` + li(['<code>DIR</code> lists files. <code>CD GAMES</code> goes into the GAMES folder, <code>CD \\</code> goes back.', 'Run a program by typing its name, like <code>CALC</code>, then Enter. The next page lists every name.', '<code>MENU</code> (or the PROGRAMS button, or F2) shows a menu you can tap or use with the arrow keys.', '<code>CATALOG</code> opens the software catalog, <code>CONTROL</code> the settings, <code>GUIDE</code> this guide.', 'Press <b>Esc</b> to close a program. The up arrow repeats your last command.'])
      : `<h4>Programs and windows</h4>` + li([`${tap} an icon to open a program.`, start ? 'Or click <b>Start</b>, then <b>Programs</b> or <b>Games</b>.' : 'Open <b>Games</b> or <b>Accessories</b> in Program Manager to find more programs.', 'Drag a window by its title bar to move it. Drag the bottom-right corner to resize it.', 'In the top-right of each window: <b>_</b> hides it on the taskbar, <b>□</b> makes it full size, <b>×</b> closes it.', 'Menus along the top of a window (like <b>Game</b> or <b>File</b>) have New game, How to play and more.']))
      + `<h4>Time travel</h4>` + li([`${dos ? 'Type <code>1990</code>, <code>1995</code> or <code>2000</code>, or tap <b>TIME MACHINE</b>' : `Click the <b>${Y}</b> button on the taskbar`} to visit another year. The computer restarts there.`, 'Your money, games, notes and high scores come with you.', 'You can also pick a year on the desk before you press Power.'])
      + `<h4>Turning off</h4>` + li([`${dos ? 'Type <code>OFF</code>' : start ? 'Choose <b>Start, Shut Down</b>' : 'Click <b>Shut Down</b>'} to turn the computer off. Everything is saved.`, 'Tired of waiting at startup? The <b>Skip the startup</b> button jumps straight to the desktop.'])
    });
    out.push({ t: 'Money: earn it and spend it', h: `<p class="qh-big">You have <b>${tester() ? 'unlimited money (tester mode)' : money(wallet())}</b> of play money.</p><p>It's pretend money. Nothing on RetroPuter ever costs real money.</p>
      <h4>Earn money</h4>` + li(['<b>Win games.</b> Most wins pay $2 to $10 (Mines, Worm, card games, quizzes, learning games and more).', `<b>Allowance:</b> ${money(ALLOWANCE)} every new day you come back, plus $1 for each day in a row (up to $7 extra).`, `<b>Work:</b> open the ${era.year < 1995 ? 'Job Board' : 'Job Center'}${dos ? ' (type <code>JOBS</code>)' : ''} for 3 daily jobs, and clock in to earn the ${Y} minimum wage (${money(MIN_WAGE[era.id] || 4)} an hour) while you use the computer. Collect your paycheck there.`, `You can earn up to ${money(DAILY_EARN_CAP)} a day from games. Come back tomorrow for more.`, `<b>Time Passport:</b> collect all ${STAMPS.length} stamps from 1985 to 2000 for a ${money(PASSPORT_BONUS)} bonus. Open the Time Passport to see what\'s left.`])
      + `<h4>Spend money</h4>` + li([`Open the <b>${esc(S.name)}</b> ${dos ? '(type <code>CATALOG</code>)' : '(the Software Store icon' + (start ? ', or Games, Get more games' : '') + ')'} and pick a game.`, `Click <b>Buy</b>. The game installs ${Y < 1995 ? 'from floppy disks' : Y < 2000 ? 'from a CD-ROM' : 'from a CD or a download'}, then it's yours to keep.`, 'Games work in the year they came out and every year after. Older years can\'t run newer games.'])
      + `<h4>Saving</h4>` + li(['Everything saves automatically in this web browser. There\'s no login.', 'To keep it safe or move it to another computer or phone (no account needed): <b>Control Panel, Backup &amp; Restore, Save to file</b>, then <b>Load from file</b> on the other device.'])
    });
    const free = mine.filter(a => !(PLUGINS[a.id] && PLUGINS[a.id].kind === 'store'));
    const bought = mine.filter(a => PLUGINS[a.id] && PLUGINS[a.id].kind === 'store');
    out.push({ t: 'What this computer can do', h: `<p>Everything below really works. ${dos ? 'Type the name in the box to run it.' : 'Open any of them from the desktop, ' + (start ? 'the Start menu' : 'Program Manager') + ' or the Games folder.'}</p>`
      + listApps('Main programs', free.filter(a => a.cat === 'main'))
      + listApps('Accessories', free.filter(a => a.cat === 'acc'))
      + listApps('Games and learning (free)', free.filter(a => a.cat === 'game'))
      + listApps('Games you bought', bought)
      + (forSale.length ? `<h4>For sale in the ${esc(S.name)}</h4><dl>${forSale.sort((a, b) => a.price - b.price).map(p => `<dt>${p.icon || ''}<b>${esc(p.label)}</b> ${money(p.price)}</dt><dd>${esc(p.help || p.tagline || '')}</dd>`).join('')}</dl>` : '')
      + (later ? `<p><i>${later} more game${later > 1 ? 's' : ''} come out in later years. Use the Time Machine to shop for them.</i></p>` : '')
    });
    const net = [];
    if (has('dial')) net.push(`<b>Get online:</b> ${dos ? 'run' : 'open'} <b>${esc(findApp('dial').label)}</b> and click Connect. The modem screeches, then you're online at ${esc(era.speedBlurb.replace(/^Modem: /, ''))}. The faster the year, the faster the Web.`);
    if (has('nv')) net.push(`<b>Surf the Web:</b> open <b>${esc(era.browser.name)}</b>. The Web is pretend but full of pages to explore, search and download from.`);
    if (has('pagebuilder')) net.push('<b>Make your own home page</b> with Home Page Builder and share a link to it.');
    if (has('chat') || has('im')) net.push(`<b>${esc((findApp('chat') || findApp('im')).label)}:</b> chat with buddies. They're friendly computer characters, not real people. Never type your real name, address or phone number. (It gets blocked anyway.)`);
    if (has('terminal')) net.push('<b>Terminal</b> dials bulletin board systems (BBSes): other people\'s computers you call on the phone to read messages, play games and swap files. The Web hasn\'t been invented yet!');
    if (has('gamesroom')) net.push('<b>Games Room:</b> once you\'re online, play Backgammon, Spades or Dots and Boxes against computer players in a pretend online lobby. Wins earn money.');
    if (has('jb')) net.push('<b>Jukebox</b> plays songs, including ones you download from the Web.');
    if (net.length) out.push({ t: dos ? 'Calling other computers' : 'Going online', h: li(net) });
    out.push({ t: 'Have fun!', h: `<p class="qh-big">That's it. Go explore ${Y}!</p>` + li([`Open this guide again any time: ${dos ? 'type <code>GUIDE</code> or pick it in the MENU' : start ? 'Start, Quick Help, or the Quick Help icon' : 'the Quick Help icon, or Help, Quick Help in Program Manager'}.`, 'For more history and tips, read <b>Read Me First</b>' + (dos ? ' (<code>TYPE README.TXT</code>)' : '') + '.', 'Each year has its own guide, and it opens the first time you visit.', 'Try the <b>Time Passport</b>: each year has stamps to collect. And write a <b>Time Capsule</b> message: it opens when you travel to a later year.']) });
    return out;
  };
  const W = openWin({ id: 'help', title: 'Quick Help', icon: 'info', w: 560, h: 440, center: true, build(W) {
    let i = page || 0;
    W.body.innerHTML = `<div class="qh"><div class="qh-page" tabindex="0"></div><div class="qh-nav"><button class="btn" data-b>&lt; Back</button><span class="qh-dots"></span><button class="btn" data-n>Next &gt;</button><button class="btn" data-x>Done</button></div></div>`;
    const pg = W.body.querySelector('.qh-page'), dots = W.body.querySelector('.qh-dots');
    W.show = n => {
      const P = pages(); i = Math.max(0, Math.min(P.length - 1, n));
      pg.innerHTML = `<h3>${esc(P[i].t)}</h3>${P[i].h}`; pg.scrollTop = 0;
      dots.textContent = `${i + 1} of ${P.length}`;
      W.body.querySelector('[data-b]').disabled = i === 0;
      W.body.querySelector('[data-n]').hidden = i === P.length - 1;
    };
    W.body.querySelector('[data-b]').onclick = () => { sfx.click(); W.show(i - 1); };
    W.body.querySelector('[data-n]').onclick = () => { sfx.click(); W.show(i + 1); };
    W.body.querySelector('[data-x]').onclick = () => closeWin(W);
    W.onKey = e => { if (e.key === 'ArrowRight' || e.key === 'PageDown') W.show(i + 1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') W.show(i - 1); };
    W.refresh = () => W.show(i);
    W.show(i);
  }});
  if (page != null && W.show) W.show(page);
  return W;
}

/* ---------- Time Traveler Passport: stamps for each year's signature activities ---------- */
function openPassport() {
  return openWin({ id: 'passport', title: 'Time Traveler Passport', icon: 'passport', w: 600, h: 460, build(W) {
    W.refresh = () => {
      const got = store.get('stamps', {}), n = STAMPS.filter(x => got[x.id]).length;
      W.body.innerHTML = `<div class="tpass"><div class="tpass-hd"><div><b>TIME TRAVELER PASSPORT</b><small>Holder: ${esc(store.get('user', 'kidsurfer'))}</small></div><div class="tpass-n"><b>${n}</b> of ${STAMPS.length} stamps</div></div>
        <p class="tpass-note">${n === STAMPS.length ? 'Every stamp collected. You\'re an official Time Traveler!' : `Visit each year and do its big things to earn stamps. Collect all ${STAMPS.length} for a ${money(PASSPORT_BONUS)} bonus.`}</p>
        <div class="tpass-years">${ERA_IDS.map(id => `<section class="tpass-year"><h4>${ERAS[id].year}</h4>${STAMPS.filter(x => String(x.year) === id).map(x => got[x.id]
          ? `<div class="tpass-stamp on" style="--r:${(x.id.length * 7 % 13) - 6}deg"><b>${x.year}</b><span>${esc(x.label)}</span><small>${new Date(got[x.id]).toLocaleDateString()}</small></div>`
          : `<div class="tpass-stamp"><b>?</b><span>${esc(x.hint)}</span></div>`).join('')}</section>`).join('')}</div></div>`;
    };
    W.refresh();
  }});
}

/* ---------- Time Capsule: bury a note in one year, dig it up in a later one ---------- */
function openCapsule() {
  return openWin({ id: 'capsule', title: 'Time Capsule', icon: 'capsule', w: 460, h: 440, build(W) {
    W.refresh = () => {
      const all = store.get('capsules', []), later = ERA_IDS.filter(id => ERAS[id].year > era.year);
      const sealed = all.filter(c => !c.opened), opened = all.filter(c => c.opened);
      W.body.innerHTML = `<div class="tc">
        <fieldset><legend>Bury a time capsule</legend>${later.length
          ? `<p>Write a message to your future self. It stays sealed until you visit a later year.</p><textarea maxlength="400" rows="4" aria-label="Your message" placeholder="Dear future me..."></textarea>
             <div class="tc-row"><label>Open it in <select>${later.map(id => `<option value="${id}">${ERAS[id].year}</option>`).join('')}</select></label><button class="btn" data-bury>Bury it</button></div>`
          : '<p>2000 is as far as this time machine goes. Capsules you bury in earlier years get dug up here!</p>'}</fieldset>
        <fieldset><legend>Still buried (${sealed.length})</legend>${sealed.length ? '<ul>' + sealed.map(c => `<li>From ${ERAS[c.from] ? ERAS[c.from].year : c.from}, opens in <b>${ERAS[c.to] ? ERAS[c.to].year : c.to}</b>. Sealed!</li>`).join('') + '</ul>' : '<p>None yet.</p>'}</fieldset>
        <fieldset><legend>Dug up (${opened.length})</legend>${opened.length ? opened.slice().reverse().map(c => `<div class="tc-note"><small>Buried in ${ERAS[c.from] ? ERAS[c.from].year : c.from}, opened in ${ERAS[c.openedIn] ? ERAS[c.openedIn].year : c.openedIn}</small><p></p></div>`).join('') : '<p>None yet.</p>'}</fieldset></div>`;
      // User text goes in with textContent, never as HTML.
      $$('.tc-note p', W.body).forEach((p, i) => { p.textContent = opened.slice().reverse()[i].text; });
      const b = W.body.querySelector('[data-bury]');
      if (b) b.onclick = () => {
        const text = W.body.querySelector('textarea').value.trim(), to = W.body.querySelector('select').value;
        if (!text) { msgBox('Time Capsule', 'Write a message first!'); return; }
        store.set('capsules', store.get('capsules', []).concat([{ from: era.id, to, text, made: Date.now(), opened: false }]));
        sfx.seek(8); toast(`Time capsule buried! Travel to ${ERAS[to].year} to dig it up.`); W.refresh();
      };
    };
    W.refresh();
  }});
}
// On arriving in a year, open every capsule meant for this year or earlier, one message at a time.
async function digCapsules() {
  const all = store.get('capsules', []), due = all.filter(c => !c.opened && ERAS[c.to] && ERAS[c.to].year <= era.year);
  if (!due.length) return;
  due.forEach(c => { c.opened = true; c.openedIn = era.id; });
  store.set('capsules', all);
  for (const c of due) {
    if (!booted) return;
    sfx.tada();
    await msgBox('Time Capsule', `You dug up a time capsule you buried in ${ERAS[c.from] ? ERAS[c.from].year : c.from}!\n\n"${c.text}"`);
  }
  earn(2, 'digging up a time capsule');
  if (wins.capsule && wins.capsule.refresh) wins.capsule.refresh();
}

/* ---------- 2000: a one-time New Year's countdown party the first time you visit ---------- */
function y2kParty(done) {
  const el = document.createElement('div'); el.className = 'y2k'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Happy New Year 2000');
  el.innerHTML = `<canvas></canvas><div class="y2k-txt"><small>December 31, 1999 &middot; 11:59 PM</small><b>10</b><span>Will the Y2K bug crash every computer at midnight?</span></div><button class="btn y2k-skip">Skip</button>`;
  layer.appendChild(el);
  const cv = el.querySelector('canvas'), g = cv.getContext('2d'), big = el.querySelector('b'), sub = el.querySelector('span'), sm = el.querySelector('small');
  const size = () => { cv.width = el.clientWidth; cv.height = el.clientHeight; }; size();
  let n = 10, raf = 0, sparks = [], over = false, t1 = 0, t2 = 0;
  const finish = () => { if (over) return; over = true; clearInterval(t1); clearTimeout(t2); cancelAnimationFrame(raf); el.remove(); done && done(); };
  el.querySelector('.y2k-skip').onclick = finish;
  const burst = () => {
    const x = Math.random() * cv.width, y = cv.height * (0.15 + Math.random() * 0.4), h = Math.random() * 360;
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 60, h }); }
    noise(0.25, { ft: 'lowpass', f: 900, vol: 0.12, decay: 1 });
  };
  const draw = () => {
    g.fillStyle = 'rgba(0,0,20,.25)'; g.fillRect(0, 0, cv.width, cv.height);
    sparks = sparks.filter(p => --p.life > 0);
    sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.04; g.fillStyle = `hsl(${p.h},100%,${40 + p.life}%)`; g.fillRect(p.x, p.y, 2, 2); });
    raf = requestAnimationFrame(draw);
  };
  draw();
  t1 = setInterval(() => {
    n--;
    if (n > 0) { big.textContent = n; sfx.blip(n > 3 ? 660 : 990); return; }
    clearInterval(t1);
    big.textContent = 'HAPPY NEW YEAR 2000!'; sm.textContent = 'January 1, 2000 · 12:00 AM';
    sub.textContent = 'Y2K bug check: all systems OK. The world did not end!';
    sfx.tada(); for (let i = 0; i < 6; i++) setTimeout(burst, i * 450);
    t2 = setTimeout(finish, 5200);
  }, 1000);
}

function openSettings() {
  openWin({ id: 'cp', title: 'Control Panel', icon: 'cp', w: 360, fixed: true, autoH: true, build(W) {
    W.body.innerHTML = `<div class="cp">
      <fieldset><legend>Sound</legend><label>Volume <input type="range" min="0" max="1" step="0.05" data-vol style="width:100%"></label><button class="btn" data-test>Test sound</button></fieldset>
      <fieldset><legend>Monitor</legend><label><input type="checkbox" data-crt> Old monitor glow and scan lines</label></fieldset>
      <fieldset><legend>Screen saver</legend><div class="ss-row"><select data-sk aria-label="Screen saver"><option value="">(None)</option>${saversFor().map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select><button class="btn" data-sp>Preview</button></div><label class="ss-row">Wait <select data-sw aria-label="Minutes before the screen saver starts">${[1, 2, 3, 5, 10, 15].map(m => `<option value="${m}">${m}</option>`).join('')}</select> minute(s)</label><label class="ss-row" data-smsg>Message <input type="text" maxlength="40" data-st aria-label="Scrolling message text"></label></fieldset>
      <fieldset><legend>Desktop color</legend><div class="sws"></div></fieldset>
      <fieldset><legend>Time machine</legend><button class="btn" data-tw>Travel to another year…</button></fieldset>
      <fieldset><legend>Saving</legend><small>Everything saves automatically in this browser.</small><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-bk>Backup &amp; restore…</button><button class="btn" data-erase>Erase hard drive…</button>${tester() ? '<button class="btn" data-tester>Leave tester mode…</button>' : ''}</div></fieldset>
      <div style="text-align:right"><button class="btn" data-ok>OK</button></div></div>`;
    const b = W.body;
    const vol = b.querySelector('[data-vol]'); vol.value = settings.vol;
    vol.oninput = () => { settings.vol = +vol.value; if (master) master.gain.value = settings.vol; saveSettings(); };
    b.querySelector('[data-test]').onclick = () => sfx[era.sounds.start]();
    const crt = b.querySelector('[data-crt]'); crt.checked = settings.crt;
    crt.onchange = () => { settings.crt = crt.checked; screen.classList.toggle('crt', settings.crt); saveSettings(); };
    const sk = b.querySelector('[data-sk]'), sw = b.querySelector('[data-sw]'), st = b.querySelector('[data-st]'), smsg = b.querySelector('[data-smsg]');
    sk.value = settings.saver ? saverKind() : ''; sw.value = String(settings.saverWait || 1); st.value = settings.saverText || 'Welcome to ' + era.os.name + '!';
    const syncMsg = () => { smsg.hidden = !(SAVERS[sk.value] && SAVERS[sk.value].custom); };
    sk.onchange = () => { settings.saver = !!sk.value; if (sk.value) settings.saverKind = sk.value; saveSettings(); syncMsg(); };
    sw.onchange = () => { settings.saverWait = +sw.value; saveSettings(); };
    st.oninput = () => { settings.saverText = st.value.slice(0, 40); saveSettings(); };
    b.querySelector('[data-sp]').onclick = () => startSaver(sk.value || saverKind(), true);
    syncMsg();
    const sws = b.querySelector('.sws');
    era.walls.forEach(([k, c, l, sw]) => {
      const x = document.createElement('button'); x.style.background = sw || c; x.title = l; x.setAttribute('aria-label', l);
      x.setAttribute('aria-pressed', eraCfg().wall === k);
      x.onclick = () => { eraCfg().wall = k; applyWall(); saveSettings(); if (dos) dos.el.style.setProperty('--phos', c); $$('button', sws).forEach(y => y.setAttribute('aria-pressed', y === x)); };
      sws.appendChild(x);
    });
    b.querySelector('[data-tw]').onclick = e => openTW(e.currentTarget);
    b.querySelector('[data-bk]').onclick = openBackup;
    b.querySelector('[data-erase]').onclick = eraseAll;
    const tb = b.querySelector('[data-tester]');
    if (tb) tb.onclick = async () => {
      const r = await msgBox('Leave tester mode', `Your money goes back to ${money(WALLET_START)}, like a new visitor.\n\nKeep the games you installed while testing?`, ['Keep games', 'Remove games', 'Cancel'], 'warn');
      if (!r || r === 'Cancel') return;
      leaveTester(r === 'Keep games'); refreshShell(); closeWin(W);
      toast(`Tester mode off. You have ${money(WALLET_START)}.`);
    };
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
      earn(5, 'winning Mines'); stamp('mines-win');
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
    menubar(W, [{ label: 'File', items: [{ label: 'New picture', fn: () => { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); } }, { label: 'Save picture', fn: () => savePic() }, { label: 'Exit', fn: () => closeWin(W) }] }]);
    // Save keeps the last picture (reopened next time) and reports it to the Work Center.
    function savePic() {
      const d = g.getImageData(0, 0, cv.width, cv.height).data, cols = new Set(); let ink = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) { n++; const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; if (k !== '255,255,255') { ink++; cols.add(k); } }
      try { store.set('paint:last', cv.toDataURL('image/png')); } catch (e) {}
      taskEvent('paint-save', { colors: cols.size, filled: ink / n }); sfx.seek(6); setTitle(W, 'Paintbox - PICTURE.BMP'); toast('Saved PICTURE.BMP');
    }
    W.body.innerHTML = `<div class="paint"><div class="main"><div class="tools">${Object.entries(TOOLS).map(([k, s]) => `<button class="btn" data-t="${k}" title="${k}" aria-label="${k}">${s}</button>`).join('')}<label style="grid-column:span 2;font-size:11px;margin-top:6px">Size<br><input type="range" min="1" max="4" value="2" data-size style="width:60px"></label></div><div class="well sunken"><canvas width="560" height="360" aria-label="Drawing canvas"></canvas></div></div><div class="pal"><div class="cur"></div><div class="sw">${VGA.map(c => `<button style="background:${c}" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div></div>`;
    const cv = W.body.querySelector('canvas'), g = cv.getContext('2d'), cur = W.body.querySelector('.cur'), sizeEl = W.body.querySelector('[data-size]');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    const lastPic = store.get('paint:last', ''); if (lastPic) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0); im.src = lastPic; }
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
    // Buddy Brain (js/buddybrain.js): offline rule-based buddies with memory, learning and safety filters.
    const BB = window.BuddyBrain, brains = {};
    const noASL = l => !/a\s*\/\s*s\s*\/\s*l|\d+\s*\/\s*[mf]\s*\//i.test(l);
    const brainFor = b => {
      if (!BB) return null;
      if (!(b.n in brains)) {
        try { brains[b.n] = BB.create({ bot: b, era: { id: era.id, year: era.year }, user: me(), mode: cfg.mode, others: cfg.bots.map(x => x.n).filter(n => n !== b.n), store: { get: (k, d) => store.get(k, d), set: (k, v) => store.set(k, v) }, cfg }); }
        catch (e) { console.error(e); brains[b.n] = null; }
      }
      return brains[b.n];
    };
    const hello = b => { const br = brainFor(b); try { if (br) return br.greet(); } catch (e) {} return subst(pick(b.hello)); };
    const chatter = (b, ambientOnly) => { const br = brainFor(b); let t = null; try { t = br && br.idle(); } catch (e) {} if (t) return t; if (ambientOnly) return null; const pool = (b.lines || []).filter(noASL); return pool.length ? subst(pick(pool)) : null; };
    const replies = (b, text) => { const br = brainFor(b); try { if (br) return br.respond(text); } catch (e) { console.error(e); } return [{ text: subst(botReply(b, text, cfg)), delay: 1500 + Math.random() * 2000 }]; };
    // Show a buddy's replies one after another, with a typing indicator while they "type".
    function deliver(b, list, where) {
      let t = 0;
      (list || []).forEach(r => {
        const d = Math.max(400, r.delay || 1500);
        later(t + 250, () => { if (online && (cfg.mode === 'room' || cur === b.n)) typing.textContent = b.n + ' is typing…'; });
        t += d;
        later(t, () => { if (!online) return; if (typing.textContent.startsWith(b.n)) typing.textContent = ''; if (cfg.mode === 'room') { line(where, b.n, ' ' + r.text, b.c); sfx.blip(700); } else incoming(b, r.text); });
      });
    }
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
        line('#room', '', 'Everyone here is a friendly computer character. Never share your real name, address or phone number online.', null, true);
        cfg.bots.slice(0, 3).forEach((b, i) => later(1200 + i * 1500, () => { line('#room', b.n, ' ' + hello(b), b.c); sfx.blip(700 + i * 90); }));
        const amb = () => { ambient = setTimeout(() => { if (!alive || !online) return; const b = pick(cfg.bots); const t = chatter(b); if (t) { line('#room', b.n, ' ' + t, b.c); sfx.blip(620); } amb(); }, 6000 + Math.random() * 7000); };
        amb();
      } else {
        sfx.door();
        cur = cfg.bots[0].n;
        cfg.bots.forEach(b => line(b.n, '', `You're chatting with ${b.n}, a friendly computer character.${b.away ? ' Away message: "' + b.away + '"' : ''}`, null, true));
        later(2500, () => { const b = cfg.bots[0]; incoming(b, hello(b)); });
        const amb = () => { ambient = setTimeout(() => { if (!alive || !online) return; const b = pick(cfg.bots.filter(x => !x.away)); const t = chatter(b, !!BB && Math.random() < 0.5); if (t) incoming(b, t); amb(); }, 16000 + Math.random() * 14000); };
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
      // What you typed is screened first: bad words are masked and personal info (numbers, emails) hidden in the log.
      let shown = text;
      if (BB) { try { const f = BB.filter(text); if (f.flagged || f.pii) shown = f.clean; } catch (e) {} }
      if (cfg.mode === 'room') {
        stamp('chat-room');
        line('#room', me(), ' ' + shown, '#000080');
        let name = null; if (BB) { try { name = BB.pickResponder(text, cfg.bots); } catch (e) {} }
        const b = cfg.bots.find(x => x.n === name) || pick(cfg.bots);
        deliver(b, replies(b, text), '#room');
      } else {
        const b = cfg.bots.find(x => x.n === cur); if (!b) return;
        line(b.n, me(), ' ' + shown, '#c00000');
        if (b.away) { later(600, () => { line(b.n, b.n, ' Auto-response: ' + b.away, b.c); sfx.msg(); }); return; }
        deliver(b, replies(b, text), b.n);
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
    const list = () => era.songs.filter(s => !s.locked || estore.get('got:' + s.locked, false)).concat(store.get('app:cdplayer:ripped', []));
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
// Pick one in Control Panel. `from` is the first year it's offered; 1985 draws everything in the monitor's phosphor color.
const saver = $('#saver'); let idleT = 0, saverOn = false, saverRAF = 0, wakeGuard = 0;
const SAVERS = {
  blank: { name: 'Blank screen', from: 1985, make: g => () => {} },
  stars: { name: 'Starfield', from: 1985, make(g, W, H, ink) {
    const cx = W / 2, cy = H / 2, stars = Array.from({ length: 220 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W }));
    return () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      stars.forEach(s => {
        s.z -= 6; if (s.z < 1) { s.z = W; s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; }
        const k = 200 / s.z, sz = Math.max(1, 3 - s.z / 250);
        g.fillStyle = ink || (s.z < 200 ? '#fff' : '#aaa'); g.globalAlpha = ink && s.z > 200 ? 0.6 : 1;
        g.fillRect(cx + s.x * k, cy + s.y * k, sz, sz); g.globalAlpha = 1;
      });
    };
  } },
  rain: { name: 'Falling letters', from: 1985, make(g, W, H, ink) {
    const fs = 16, cols = Math.ceil(W / fs), drops = Array.from({ length: cols }, () => Math.random() * -H / fs), chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*<>?';
    g.font = `${fs}px VT323, "Courier New", monospace`;
    let t = 0;
    return () => {
      if (++t % 3) return;
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, W, H);
      g.fillStyle = ink || '#3f6'; g.font = `${fs}px VT323, "Courier New", monospace`;
      drops.forEach((d, i) => { g.fillText(pick(chars), i * fs, d * fs); drops[i] = d * fs > H && Math.random() > 0.97 ? 0 : d + 1; });
    };
  } },
  maze: { name: '3D Maze', from: 1995, make(g, W, H) {
    // A random maze explored with the right-hand rule, drawn with a simple raycaster.
    const N = 13, M = Array.from({ length: N }, () => Array(N).fill(1));
    const carve = (x, y) => { M[y][x] = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5).forEach(([dx, dy]) => { const nx = x + dx * 2, ny = y + dy * 2; if (nx > 0 && ny > 0 && nx < N - 1 && ny < N - 1 && M[ny][nx]) { M[y + dy][x + dx] = 0; carve(nx, ny); } }); };
    carve(1, 1);
    const D = [[1, 0], [0, 1], [-1, 0], [0, -1]], open = (x, y) => M[y] && M[y][x] === 0;
    let cx = 1, cy = 1, d = 0, px = 1.5, py = 1.5, ang = 0, act = null;
    const next = () => {
      for (const t of [1, 0, 3, 2]) { const nd = (d + t) % 4; if (open(cx + D[nd][0], cy + D[nd][1])) {
        if (t === 0) return { kind: 'move' };
        d = nd; return { kind: 'turn', to: nd * Math.PI / 2, then: true };
      } }
    };
    const col = 4, fov = Math.PI / 3;
    return () => {
      if (!act) act = next();
      if (act.kind === 'turn') {
        let diff = act.to - ang; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) < 0.06) { ang = act.to; act = { kind: 'move' }; } else ang += Math.sign(diff) * 0.06;
      } else {
        const tx = cx + D[d][0] + 0.5, ty = cy + D[d][1] + 0.5;
        px += (tx - px) * 0.08 + Math.sign(tx - px) * 0.01; py += (ty - py) * 0.08 + Math.sign(ty - py) * 0.01;
        if (Math.abs(tx - px) < 0.03 && Math.abs(ty - py) < 0.03) { px = tx; py = ty; cx += D[d][0]; cy += D[d][1]; act = null; }
      }
      g.fillStyle = '#10205a'; g.fillRect(0, 0, W, H / 2); g.fillStyle = '#5a5a5a'; g.fillRect(0, H / 2, W, H / 2);
      for (let x = 0; x < W; x += col) {
        const a = ang - fov / 2 + fov * x / W, rx = Math.cos(a), ry = Math.sin(a);
        let mx = Math.floor(px), my = Math.floor(py), side = 0;
        const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry), sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1;
        let sdx = (rx < 0 ? px - mx : mx + 1 - px) * ddx, sdy = (ry < 0 ? py - my : my + 1 - py) * ddy;
        for (let i = 0; i < 64; i++) { if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; } if (!open(mx, my)) break; }
        const dist = (side ? sdy - ddy : sdx - ddx) * Math.cos(a - ang), h = Math.min(H * 2, H / Math.max(0.05, dist));
        const hit = side ? px + dist / Math.cos(a - ang) * rx : py + dist / Math.cos(a - ang) * ry, u = hit - Math.floor(hit);
        const brick = (u * 4 | 0) % 2 ? 1 : 0.88, shade = Math.max(0.25, 1 - dist / 9) * (side ? 0.8 : 1) * brick;
        g.fillStyle = `rgb(${170 * shade | 0},${70 * shade | 0},${50 * shade | 0})`;
        g.fillRect(x, (H - h) / 2, col, h);
        g.fillStyle = `rgba(0,0,0,${0.25 * shade})`; g.fillRect(x, (H - h) / 2 + h * 0.5, col, 1);
      }
    };
  } },
  mystify: { name: 'Mystery lines', from: 1990, make(g, W, H) {
    const mk = () => Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, dx: (Math.random() * 4 + 2) * (Math.random() < 0.5 ? -1 : 1), dy: (Math.random() * 4 + 2) * (Math.random() < 0.5 ? -1 : 1) }));
    const shapes = [{ p: mk(), h: 200 }, { p: mk(), h: 30 }];
    return () => {
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, W, H);
      shapes.forEach(s => {
        s.h = (s.h + 0.6) % 360;
        s.p.forEach(v => { v.x += v.dx; v.y += v.dy; if (v.x < 0 || v.x > W) v.dx *= -1; if (v.y < 0 || v.y > H) v.dy *= -1; });
        g.strokeStyle = `hsl(${s.h},100%,60%)`; g.lineWidth = 1.5; g.beginPath();
        s.p.forEach((v, i) => i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)); g.closePath(); g.stroke();
      });
    };
  } },
  floppies: { name: 'Flying floppies', from: 1990, make(g, W, H) {
    const cols = ['#223', '#1a3a8a', '#8a1a1a', '#1a6a2a', '#555'];
    const disks = Array.from({ length: 14 }, () => ({ x: Math.random() * W * 1.5, y: Math.random() * H * 1.5 - H * 0.5, s: 0.6 + Math.random() * 0.8, c: pick(cols), f: Math.random() * 6 }));
    const draw = d => {
      const s = 30 * d.s, flap = Math.sin(d.f) * 0.8;
      g.save(); g.translate(d.x, d.y);
      g.fillStyle = '#ddd';
      [-1, 1].forEach(side => { g.beginPath(); g.moveTo(side * s * 0.5, -s * 0.2); g.lineTo(side * s * 1.25, -s * (0.55 + flap * 0.5)); g.lineTo(side * s * 1.1, s * 0.05); g.closePath(); g.fill(); });
      g.fillStyle = d.c; g.fillRect(-s / 2, -s / 2, s, s);
      g.fillStyle = '#bbb'; g.fillRect(-s * 0.28, -s / 2, s * 0.5, s * 0.34); g.fillStyle = d.c; g.fillRect(-s * 0.05, -s * 0.44, s * 0.12, s * 0.22);
      g.fillStyle = '#f4f4f4'; g.fillRect(-s * 0.36, s * 0.05, s * 0.72, s * 0.4);
      g.fillStyle = '#88a'; g.fillRect(-s * 0.3, s * 0.14, s * 0.5, s * 0.04); g.fillRect(-s * 0.3, s * 0.26, s * 0.4, s * 0.04);
      g.restore();
    };
    return () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      disks.sort((a, b) => a.s - b.s).forEach(d => { d.x -= 1.6 * d.s; d.y += 0.9 * d.s; d.f += 0.25; if (d.x < -60 || d.y > H + 60) { d.x = W + 40 + Math.random() * W * 0.5; d.y = Math.random() * H - H * 0.4; } draw(d); });
    };
  } },
  aquarium: { name: 'Aquarium', from: 1990, make(g, W, H) {
    const cols = ['#ff8c1a', '#ffd21a', '#ff4f7b', '#4fd2ff', '#9b6bff', '#6bff8e'];
    const fish = Array.from({ length: 9 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * (H - 140), v: (0.6 + Math.random() * 1.2) * (Math.random() < 0.5 ? -1 : 1), s: 0.7 + Math.random() * 0.9, c: pick(cols), p: Math.random() * 6 }));
    const bubbles = [], weed = Array.from({ length: Math.ceil(W / 70) }, (_, i) => ({ x: i * 70 + Math.random() * 40, h: 60 + Math.random() * 90 }));
    let t = 0;
    return () => {
      t++;
      const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#0a3a7a'); sea.addColorStop(1, '#021634');
      g.fillStyle = sea; g.fillRect(0, 0, W, H);
      g.fillStyle = '#c8a860'; g.fillRect(0, H - 30, W, 30);
      weed.forEach(w => { g.strokeStyle = '#1f8a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(w.x, H - 28); for (let k = 1; k <= 6; k++) g.lineTo(w.x + Math.sin(t / 30 + k + w.x) * 8, H - 28 - w.h * k / 6); g.stroke(); });
      if (Math.random() < 0.06) bubbles.push({ x: Math.random() * W, y: H - 30, r: 2 + Math.random() * 4 });
      g.strokeStyle = 'rgba(200,230,255,.7)'; g.lineWidth = 1;
      for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.y -= 1.2; b.x += Math.sin((b.y + i) / 12) * 0.4; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.3); g.stroke(); if (b.y < -10) bubbles.splice(i, 1); }
      fish.forEach(f => {
        f.x += f.v; f.p += 0.15; if (f.x < -60 || f.x > W + 60) { f.v *= -1; f.y = 40 + Math.random() * (H - 140); }
        const s = 22 * f.s, dir = Math.sign(f.v), y = f.y + Math.sin(f.p / 3) * 4;
        g.save(); g.translate(f.x, y); g.scale(dir, 1);
        g.fillStyle = f.c; g.beginPath(); g.ellipse(0, 0, s, s * 0.55, 0, 0, 6.3); g.fill();
        g.beginPath(); g.moveTo(-s * 0.8, 0); g.lineTo(-s * 1.5, -s * (0.5 + Math.sin(f.p) * 0.15)); g.lineTo(-s * 1.5, s * (0.5 + Math.sin(f.p) * 0.15)); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.5, -s * 0.12, s * 0.16, 0, 6.3); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.arc(s * 0.55, -s * 0.12, s * 0.08, 0, 6.3); g.fill();
        g.restore();
      });
    };
  } },
  fireworks: { name: 'Fireworks', from: 1990, make(g, W, H) {
    const parts = [], rockets = [];
    return () => {
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, W, H);
      if (Math.random() < 0.035) rockets.push({ x: W * (0.15 + Math.random() * 0.7), y: H, vy: -(H / 90 + Math.random() * 3), h: Math.random() * 360 });
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.y += r.vy; r.vy += 0.09;
        g.fillStyle = '#fc6'; g.fillRect(r.x, r.y, 2, 5);
        if (r.vy > -0.5) { rockets.splice(i, 1); const n = 60 + (Math.random() * 40 | 0); for (let k = 0; k < n; k++) { const a = Math.random() * 6.3, sp = 1 + Math.random() * 3.5; parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 60 + Math.random() * 30, h: r.h + Math.random() * 40 }); } }
      }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.985; p.l--; g.fillStyle = `hsla(${p.h},100%,65%,${Math.min(1, p.l / 40)})`; g.fillRect(p.x, p.y, 2, 2); if (p.l <= 0) parts.splice(i, 1); }
    };
  } },
  marquee: { name: 'Scrolling message', from: 1990, custom: true, make(g, W, H) {
    const text = settings.saverText || 'Welcome to ' + era.os.name + '!';
    let x = W, y = H / 2, h = 0;
    return () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.font = '700 64px Georgia, "Times New Roman", serif';
      const tw = g.measureText(text).width;
      x -= 2.4; h = (h + 0.5) % 360;
      if (x < -tw) { x = W; y = 70 + Math.random() * (H - 140); }
      g.fillStyle = `hsl(${h},90%,62%)`; g.fillText(text, x, y);
    };
  } },
  pipes: { name: 'Pipe maze', from: 1995, make(g, W, H) {
    const S = 26, cw = Math.floor(W / S), ch = Math.floor(H / S);
    let grid, pipes, filled, t;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const reset = () => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); grid = new Uint8Array(cw * ch); pipes = []; filled = 0; t = 0; };
    const spawn = () => { for (let k = 0; k < 40; k++) { const x = Math.random() * cw | 0, y = Math.random() * ch | 0; if (!grid[y * cw + x]) { grid[y * cw + x] = 1; filled++; pipes.push({ x, y, d: pick(DIRS), h: Math.random() * 360 }); return; } } };
    const shade = (h, l) => `hsl(${h},75%,${l}%)`;
    const joint = p => { const cx = p.x * S + S / 2, cy = p.y * S + S / 2, gr = g.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, S * 0.42); gr.addColorStop(0, shade(p.h, 80)); gr.addColorStop(1, shade(p.h, 30)); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, S * 0.42, 0, 6.3); g.fill(); };
    const seg = (p, q) => {
      const x1 = p.x * S + S / 2, y1 = p.y * S + S / 2, x2 = q.x * S + S / 2, y2 = q.y * S + S / 2, horiz = y1 === y2, w = S * 0.5;
      const gr = horiz ? g.createLinearGradient(0, y1 - w / 2, 0, y1 + w / 2) : g.createLinearGradient(x1 - w / 2, 0, x1 + w / 2, 0);
      gr.addColorStop(0, shade(p.h, 25)); gr.addColorStop(0.35, shade(p.h, 75)); gr.addColorStop(1, shade(p.h, 22));
      g.fillStyle = gr; if (horiz) g.fillRect(Math.min(x1, x2), y1 - w / 2, Math.abs(x2 - x1), w); else g.fillRect(x1 - w / 2, Math.min(y1, y2), w, Math.abs(y2 - y1));
    };
    reset();
    return () => {
      if (++t % 2) return;
      if (filled > cw * ch * 0.6) reset();
      if (!pipes.length || (pipes.length < 3 && Math.random() < 0.01)) { spawn(); pipes.forEach(joint); }
      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        const opts = (Math.random() < 0.75 ? [p.d] : []).concat(DIRS.slice().sort(() => Math.random() - 0.5)).filter(d => { const nx = p.x + d[0], ny = p.y + d[1]; return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !grid[ny * cw + nx]; });
        if (!opts.length) { joint(p); pipes.splice(i, 1); continue; }
        const d = opts[0], q = { x: p.x + d[0], y: p.y + d[1], d, h: p.h };
        if (d !== p.d) joint(p);
        seg(p, q); grid[q.y * cw + q.x] = 1; filled++; pipes[i] = q;
      }
    };
  } },
  bounce: { name: 'Bouncing logo', from: 1995, make(g, W, H) {
    const text = era.saverText || era.os.name; let x = W / 3, y = H / 3, dx = 2.2, dy = 1.8, h = 200;
    g.font = '700 42px Tahoma, Verdana, sans-serif';
    const tw = g.measureText(text).width;
    return () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      x += dx; y += dy;
      if (x < 0 || x + tw > W) { dx *= -1; h = (h + 67) % 360; x = Math.max(0, Math.min(x, W - tw)); }
      if (y < 42 || y > H) { dy *= -1; h = (h + 67) % 360; y = Math.max(42, Math.min(y, H)); }
      g.font = '700 42px Tahoma, Verdana, sans-serif'; g.fillStyle = `hsl(${h},90%,60%)`; g.fillText(text, x, y);
    };
  } },
  clock: { name: 'Big clock', from: 1995, make(g, W, H) {
    let x = W / 2, y = H / 2, next = 0;
    return () => {
      const now = Date.now();
      if (now > next) { next = now + 6000; x = W * (0.25 + Math.random() * 0.5); y = H * (0.3 + Math.random() * 0.45); }
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const d = new Date(), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      g.textAlign = 'center'; g.fillStyle = '#6cf'; g.font = '700 72px Tahoma, Verdana, sans-serif'; g.fillText(t, x, y);
      g.fillStyle = '#8aa'; g.font = '20px Tahoma, Verdana, sans-serif'; g.fillText(d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + ', ' + era.year, x, y + 36);
      g.textAlign = 'start';
    };
  } }
};
const saversFor = () => Object.entries(SAVERS).filter(([, s]) => s.from <= era.year);
const saverKind = () => { const k = settings.saverKind; return k && SAVERS[k] && SAVERS[k].from <= era.year ? k : (SAVERS[era.saver] ? era.saver : 'stars'); };
function wake() {
  if (Date.now() < wakeGuard) return;
  idleT = Date.now();
  if (saverOn) { saverOn = false; saver.style.display = 'none'; cancelAnimationFrame(saverRAF); }
}
['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));
setInterval(() => {
  if (saverOn || !settings.saver || !stageOn('st-desk')) return;
  if (music && music.owner === 'jb') { idleT = Date.now(); return; }
  if (Date.now() - idleT > (settings.saverWait || 1) * 60000) startSaver();
}, 2000);
function startSaver(kind, preview) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && !preview) return;
  closeStart(); closeTW(); closeMenu();
  saverOn = true; saver.style.display = 'block';
  if (preview) wakeGuard = Date.now() + 900; // don't wake from the click that started the preview
  const r = saver.getBoundingClientRect(); saver.width = r.width; saver.height = r.height;
  const g = saver.getContext('2d'), Wd = r.width, Ht = r.height;
  g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Ht);
  const ink = era.shell === 'dos' ? (era.walls.find(w => w[0] === eraCfg().wall) || era.walls[0])[1] : null;
  const frame = SAVERS[kind || saverKind()].make(g, Wd, Ht, ink);
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

/* ---------- 1985: the DOS command line ---------- */
// Programs get a DOS command name from their `cmd` field (or their id), shown as NAME.EXE in C:\PROGRAMS.
const dosCmd = a => ((PLUGINS[a.id] && PLUGINS[a.id].cmd) || a.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const DOS_FIXED = {
  'AUTOEXEC.BAT': '@ECHO OFF\nPROMPT $P$G\nPATH C:\;C:\\PROGRAMS;C:\\GAMES\nECHO Welcome! Type HELP for commands, or MENU for a menu.',
  'CONFIG.SYS': 'FILES=20\nBUFFERS=15',
  'COMMAND.COM': null
};
let dos = null;
function dosTree() {
  const run = apps().filter(a => !['readme', 'files', 'help'].includes(a.id));
  const games = run.filter(a => a.cat === 'game'), progs = run.filter(a => a.cat !== 'game');
  const docs = { 'README.TXT': era.files['README.TXT'], 'MYNOTES.TXT': store.get('mynotes', '') };
  Object.keys(era.files).forEach(f => { if (f !== 'README.TXT' && estore.get('got:' + f, false)) docs[f] = era.files[f]; });
  const exe = list => Object.fromEntries(list.map(a => [dosCmd(a) + '.EXE', { app: a }]));
  return {
    '': Object.assign({ PROGRAMS: 'dir', GAMES: 'dir' }, DOS_FIXED, docs),
    PROGRAMS: exe(progs),
    GAMES: exe(games)
  };
}
function buildDosShell() {
  const el = document.createElement('div'); el.id = 'dos';
  el.innerHTML = `<div class="dos-out" aria-live="polite"></div><div class="dos-line"><span class="dos-pr"></span><input class="dos-in" spellcheck="false" autocomplete="off" autocapitalize="characters" aria-label="Type a command"></div>
    <div class="dos-bar"><button data-k="help">F1 HELP</button><button data-k="menu">F2 PROGRAMS</button><button data-k="dir">F3 FILES</button><button data-k="tm" class="dos-tm">F10 TIME MACHINE</button><button data-k="off">OFF</button></div>`;
  layer.prepend(el);
  dos = { el, out: el.querySelector('.dos-out'), input: el.querySelector('.dos-in'), pr: el.querySelector('.dos-pr'), cwd: '', hist: [], hi: 0 };
  const phos = () => (era.walls.find(w => w[0] === eraCfg().wall) || era.walls[0])[1];
  el.style.setProperty('--phos', phos());
  dosPrompt();
  dosPrint('Horizon DOS Version 2.11\n\nNew here? Type GUIDE for a quick tour, HELP for commands, or tap PROGRAMS below for a menu.\nTo visit another year, type 1990, 1995 or 2000, or tap TIME MACHINE.\n');
  el.querySelector('.dos-bar').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return; sfx.key();
    ({ help: () => dosRun('HELP'), menu: dosMenu, dir: () => dosRun('DIR'), tm: () => openTW(el.querySelector('.dos-tm')), off: askShutdown })[b.dataset.k]();
  });
  dos.input.addEventListener('keydown', e => {
    // Stop the Enter here so a program launched by it doesn't also receive it.
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const v = dos.input.value; dos.input.value = ''; dosRun(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (dos.hi > 0) dos.input.value = dos.hist[--dos.hi] || ''; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); dos.hi = Math.min(dos.hist.length, dos.hi + 1); dos.input.value = dos.hist[dos.hi] || ''; }
    else if (e.key.length === 1 || e.key === 'Backspace') sfx.key();
  });
  el.addEventListener('pointerup', e => { if (!e.target.closest('button') && !getSelection().toString()) dosFocus(); });
  dosFocus();
}
function dosFocus() { if (dos && !activeWin()) setTimeout(() => dos && dos.input.focus({ preventScroll: true }), 0); }
function dosPrompt() { dos.pr.textContent = 'C:\\' + dos.cwd + '>'; }
function dosPrint(text) {
  dos.out.appendChild(document.createTextNode(text.endsWith('\n') ? text : text + '\n'));
  while (dos.out.childNodes.length > 400) dos.out.firstChild.remove();
  dos.el.scrollTop = dos.el.scrollHeight;
}
function dosPath(arg) {
  let p = arg.toUpperCase().replace(/\//g, '\\').replace(/^C:/, '');
  if (p.startsWith('\\')) p = p.slice(1); else if (dos.cwd && p) p = dos.cwd + '\\' + p;
  const parts = []; p.split('\\').forEach(s => { if (!s || s === '.') return; if (s === '..') parts.pop(); else parts.push(s); });
  return parts.join('\\');
}
function dosRun(line) {
  const raw = String(line).trim();
  dosPrint(dos.pr.textContent + raw);
  if (raw) { dos.hist.push(raw); dos.hi = dos.hist.length; }
  if (!raw) return;
  const m = raw.match(/^(\S+?)(?:\s+(.*))?$/) || [], cmd = (m[1] || '').toUpperCase().replace(/\.(EXE|COM|BAT)$/, ''), arg = (m[2] || '').trim();
  const T = dosTree(), here = T[dos.cwd] || {};
  const findApp = name => { for (const dir of ['', 'PROGRAMS', 'GAMES']) { const f = (T[dir] || {})[name + '.EXE']; if (f) return f.app; } return null; };
  const cmds = {
    HELP: () => dosPrint(`Commands you can type:
  DIR          list files            CD name     go into a folder (CD \\ = top)
  TYPE file    show a text file      CLS         clear the screen
  MENU         program menu          CATALOG     the mail-order software catalog
  EDIT         write notes           CONTROL     settings (sound, screen color)
  GUIDE        the quick help guide: how everything works, money, programs
  JOBS         the job board: daily jobs and the time clock earn money
  COLOR        change screen color   VER, DATE, TIME, MEM   system info
  1990  1995  2000   travel to another year          OFF    turn off
Programs: type a name from DIR PROGRAMS or DIR GAMES, like ${Object.keys(T.GAMES)[0] ? Object.keys(T.GAMES)[0].replace('.EXE', '') : 'CALC'}.`),
    '?': () => cmds.HELP(),
    CLS: () => { dos.out.textContent = ''; },
    VER: () => dosPrint('\nHorizon DOS Version 2.11\n'),
    DATE: () => { const d = new Date(); dosPrint(`Current date is ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(1985, d.getMonth(), d.getDate()).getDay()]} ${d.getMonth() + 1}-${d.getDate()}-1985`); },
    TIME: () => dosPrint('Current time is ' + new Date().toLocaleTimeString([], { hour12: false })),
    MEM: () => dosPrint('\n   655360 bytes total memory\n   591200 bytes free\n'),
    ECHO: () => dosPrint(arg || 'ECHO is on'),
    DIR: () => {
      const p = arg ? dosPath(arg) : dos.cwd, d = T[p];
      if (!d) { dosPrint('File not found'); return; }
      const rows = Object.entries(d).map(([n, v]) => {
        const [base, ext = ''] = n.split('.'), isDir = v === 'dir';
        const size = isDir ? '<DIR>   ' : String(v && v.app ? ((PLUGINS[v.app.id] && PLUGINS[v.app.id].sizeKB) || 48) * 1024 : typeof v === 'string' ? v.length : 25307).padStart(8);
        return `${base.padEnd(8)} ${ext.padEnd(3)} ${size}   1-01-85  12:00p`;
      });
      dosPrint(`\n Volume in drive C is HORIZON\n Directory of  C:\\${p}\n\n${rows.join('\n')}\n        ${rows.length} File(s)   ${(9 - rows.length * 0.05).toFixed(2)}M bytes free\n`);
    },
    CD: () => {
      if (!arg) { dosPrint('C:\\' + dos.cwd); return; }
      const p = dosPath(arg);
      if (p === '' || T[p]) { dos.cwd = p; dosPrompt(); } else dosPrint('Invalid directory');
    },
    CHDIR: () => cmds.CD(),
    TYPE: () => {
      const f = here[arg.toUpperCase()] ?? T[''][arg.toUpperCase()];
      if (typeof f === 'string') dosPrint(f || '(empty file)');
      else if (f === null || (f && f.app)) dosPrint('\u263a\u2665\u266a\u25ba\u2022 \u00b6\u00a7 That is a program, not text. It looks like gibberish. Type its name to run it.');
      else dosPrint('File not found - ' + arg.toUpperCase());
    },
    EDIT: () => openNotepad('MYNOTES.TXT'),
    MENU: () => dosMenu(),
    CATALOG: () => openStore(),
    GUIDE: () => openHelp(),
    JOBS: () => openWork(),
    CONTROL: () => openSettings(),
    COLOR: () => { const i = era.walls.findIndex(w => w[0] === eraCfg().wall); eraCfg().wall = era.walls[(i + 1) % era.walls.length][0]; saveSettings(); dos.el.style.setProperty('--phos', era.walls[(i + 1) % era.walls.length][1]); },
    OFF: () => askShutdown(), SHUTDOWN: () => askShutdown(), EXIT: () => askShutdown(),
    TIMEMACHINE: () => openTW(dos.el.querySelector('.dos-tm')), TM: () => cmds.TIMEMACHINE(),
    WIN: () => dosPrint('Windows? Pictures? A mouse? Those are coming in a few years.\nType 1990 to jump ahead and see.'),
    FORMAT: () => dosPrint('Nice try. This museum computer is protected. (In 1985, FORMAT C: really would erase everything.)'),
    DEL: () => dosPrint('Access denied. This museum computer is protected.'), ERASE: () => cmds.DEL(),
    DIAL: () => { const a = findApp('TERMINAL') || findApp('BBS'); a ? a.open() : dosPrint('No terminal program is installed. Check the CATALOG.'); }
  };
  if (/^(19(85|90|95)|2000)$/.test(cmd)) { if (cmd === era.id) dosPrint('You are already in ' + cmd + '.'); else switchEra(cmd); return; }
  if (cmds[cmd]) { cmds[cmd](); return; }
  const a = findApp(cmd);
  if (a) { dosPrint(''); a.open(); return; }
  const low = cmd.toLowerCase();
  const future = Object.values(PLUGINS).find(p => dosCmd({ id: p.id }) === cmd || p.id === low);
  if (future && future.kind === 'store' && !isOwned(future.id) && future.year <= era.year) { dosPrint(`${future.label} isn't installed. Type CATALOG to order it.`); return; }
  dosPrint('Bad command or file name');
}
function dosMenu() {
  const items = [
    ...apps().filter(a => !['files', 'readme', 'cp', 'store', 'help'].includes(a.id)).map(a => ({ label: a.label, hint: dosCmd(a), fn: a.open })),
    { label: 'Quick Help guide', hint: 'GUIDE', fn: () => openHelp() },
    { label: 'Read Me', hint: 'TYPE README.TXT', fn: () => openNotepad('README.TXT') },
    { label: 'Software Catalog', hint: 'CATALOG', fn: () => openStore() },
    { label: 'Control Panel', hint: 'CONTROL', fn: openSettings },
    { label: 'Time Machine: visit another year', hint: '1990', fn: () => openTW(dos.el.querySelector('.dos-tm')) },
    { label: 'Turn off the computer', hint: 'OFF', fn: askShutdown }
  ];
  openWin({ id: 'dosmenu', title: 'PROGRAM MENU', icon: null, w: 460, fixed: true, autoH: true, build(W) {
    W.body.innerHTML = `<div class="dos-menu"><p>Use the arrow keys and Enter, or tap a line.</p><ol>${items.map((it, i) => `<li><button data-i="${i}"><b>${esc(it.label)}</b><small>${esc(it.hint)}</small></button></li>`).join('')}</ol></div>`;
    let sel = 0; const btns = $$('button', W.body);
    const hi = () => btns.forEach((b, i) => b.classList.toggle('on', i === sel));
    btns.forEach((b, i) => b.onclick = () => { closeWin(W); items[i].fn(); });
    W.onKey = e => {
      if (e.key === 'ArrowDown') { sel = (sel + 1) % items.length; hi(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; hi(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); closeWin(W); items[sel].fn(); }
    };
    hi(); setTimeout(() => btns[0] && btns[0].focus(), 30);
  }});
}

/* ---------- time machine ---------- */
function setEra(id) {
  era = ERAS[id] || ERAS[ERA_IDS[0]];
  store.set('era', era.id);
  ERA_IDS.forEach(k => screen.classList.toggle('era-' + k, k === era.id));
  document.title = 'Log On to ' + era.year;
  $('#st-splash').innerHTML = era.splash;
  applyWall(); setupTaskbar(); tickClock(); renderRoom();
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
  layoutRoom();
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
  const S = { left: 0, top: 0, width: innerWidth, height: innerHeight };
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
  $$('#deskicons, #dos').forEach(x => x.remove()); dos = null;
  document.body.classList.remove('wait');
  visited.clear();
}
async function switchEra(id) {
  closeTW();
  if (id === era.id && booted && stageOn('st-desk')) return;
  bootTok++; skipping = true; booted = false;
  teardown();
  if (stageOn('st-power') || stageOn('st-bye')) { setEra(id); renderPower(); if (stageOn('st-bye')) show('st-power'); return; }
  powerAnim('poweroff'); noise(0.08, { ft: 'lowpass', f: 300, vol: 0.5, decay: 1 });
  await sleep(480);
  screen.classList.remove('poweroff');
  if (!roomOn) { show('st-power'); setLeds(false); await zoomOut(); }
  setEra(id); renderPower();
  await sleep(roomOn ? 500 : 0);
  boot();
}

/* ---------- the desk: you see the computer first, it boots on its little monitor, then we zoom into the screen ---------- */
const room = $('#room'), VW = 640, VH = 480; // the screen is laid out at 640x480 (VGA) while it sits in the monitor
let roomOn = false;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function rigHTML(id) {
  const drive525 = (x, y) => `<i class="dr d525" style="left:${x}u;top:${y}u"></i>`;
  const u = s => s.replace(/(-?[\d.]+)u/g, 'calc(var(--u)*$1)');
  const common = `<i class="kb"></i>`;
  const R = {
    '1985': `<i class="case" style="left:14u;top:50u;width:72u;height:12u">${drive525(40, 2)}${drive525(56, 2)}<i class="badge" style="left:4u;top:4u">HORIZON PC</i><button class="pbtn" style="left:4u;top:7.2u" aria-label="Power switch"><i class="led"></i></button><i class="led hdd" style="left:10u;top:8.4u"></i></i>
      <i class="mon" style="left:26u;top:9u;width:48u;height:41u"><i class="glass" style="left:4u;top:3u;width:40u;height:30u"></i><i class="brand">MONOCHROME DISPLAY</i><i class="knob" style="left:40u;top:35u"></i><i class="knob" style="left:36u;top:35u"></i></i>${common}`,
    '1990': `<i class="case" style="left:14u;top:50u;width:72u;height:12u"><i class="dr d525" style="left:44u;top:2u"></i><i class="dr d35" style="left:60u;top:3.2u"></i><i class="badge" style="left:4u;top:3u">HORIZON 386</i><i class="turbo" style="left:22u;top:7u">TURBO</i><button class="pbtn" style="left:4u;top:7u" aria-label="Power button"><i class="led"></i></button><i class="led hdd" style="left:10u;top:8.2u"></i></i>
      <i class="mon" style="left:26u;top:9u;width:48u;height:41u"><i class="glass" style="left:4u;top:3u;width:40u;height:30u"></i><i class="brand">VGA COLOR</i><i class="knob" style="left:40u;top:35u"></i></i>${common}<i class="mouse" style="left:88u;top:67u"></i>`,
    '1995': `<i class="tower" style="left:81u;top:20u;width:15u;height:42u"><i class="dr cd" style="left:1.5u;top:4u"></i><i class="dr d35 v" style="left:4u;top:11u"></i><i class="badge" style="left:2u;top:17u">PENTIUM</i><button class="pbtn" style="left:5.5u;top:28u" aria-label="Power button"><i class="led"></i></button><i class="led hdd" style="left:10u;top:36u"></i></i>
      <i class="spk" style="left:8u;top:40u"></i><i class="mon big" style="left:22u;top:6u;width:52u;height:48u"><i class="glass" style="left:4u;top:4u;width:44u;height:33u"></i><i class="brand">Multimedia 15"</i><i class="knob" style="left:44u;top:41u"></i></i><i class="stand" style="left:38u;top:54u"></i>${common}<i class="mouse" style="left:82u;top:67u"></i>`,
    '2000': `<i class="tower slim" style="left:82u;top:12u;width:16u;height:50u"><i class="dr cd" style="left:1.5u;top:4u"></i><i class="dr cd" style="left:1.5u;top:9u"></i><i class="dr d35 v" style="left:4u;top:15u"></i><i class="badge" style="left:2u;top:22u">PENTIUM III</i><button class="pbtn" style="left:6u;top:33u" aria-label="Power button"><i class="led"></i></button><i class="led hdd" style="left:11u;top:42u"></i></i>
      <i class="spk tall" style="left:6u;top:34u"></i><i class="mon big" style="left:18u;top:3u;width:56u;height:51u"><i class="glass" style="left:4u;top:4u;width:48u;height:36u"></i><i class="brand">17" FLAT SCREEN</i><i class="cam"></i></i><i class="stand" style="left:36u;top:54u"></i>${common}<i class="mouse opt" style="left:80u;top:67u"></i>`
  };
  return u(R[id] || R['1990']);
}
function renderRoom() {
  room.dataset.era = era.id;
  room.querySelector('.rm-rig').innerHTML = rigHTML(era.id);
  room.querySelector('.pbtn').onclick = roomPower;
  layoutRoom();
}
function layoutRoom() {
  if (!roomOn) return;
  const W = innerWidth, H = innerHeight, land = W >= H * 1.1, ui = room.querySelector('.rm-ui'), rig = room.querySelector('.rm-rig');
  room.classList.toggle('land', land);
  let ax = 0, ay = 0, aw = W, ah = H;
  if (land) { const uiw = Math.min(W * 0.42, 480); ax = uiw; aw = W - uiw; }
  else { const uih = ui.offsetHeight; ay = uih; ah = H - uih; }
  // Ad slot: standard sizes, only on the desk (never over the computer's screen or windows).
  const ad = land ? (aw >= 760 && H >= 560 ? [728, 90] : aw >= 500 && H >= 460 ? [468, 60] : null) : (W >= 330 && ah >= 420 ? [320, 50] : null);
  placeAd(ad, land ? ax + (aw - (ad ? ad[0] : 0)) / 2 : (W - (ad ? ad[0] : 0)) / 2, land ? 14 : H - (ad ? ad[1] : 0) - 12);
  if (ad && land) { ay += ad[1] + 30; ah -= ad[1] + 30; } else if (ad) ah -= ad[1] + 24;
  const u = Math.max(2, Math.min(aw / 102, ah / 80));
  rig.style.setProperty('--u', u + 'px');
  const left = ax + (aw - 100 * u) / 2, top = ay + Math.max(0, (ah - 78 * u) / 2);
  rig.style.left = left + 'px'; rig.style.top = top + 'px';
  room.querySelector('.rm-desk').style.top = (top + 62 * u) + 'px';
  fitScreen();
}
/* The desk's ad slot. Ads come from js/ads.js (window.RETRO_ADS); one is chosen per visit. */
const AD = (() => { const list = (window.RETRO_ADS || []).filter(a => a && a.href && a.html && a.active !== false); return list.length ? list[Math.random() * list.length | 0] : null; })();
function placeAd(size, x, y) {
  const el = room.querySelector('.rm-ad');
  if (!size || !AD) { el.hidden = true; return; }
  const [w, h] = size, key = w + 'x' + h;
  el.hidden = false; el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  const box = el.querySelector('.rm-ad-box');
  box.style.width = w + 'px'; box.style.height = h + 'px';
  if (box.dataset.size === key) return;
  box.dataset.size = key; box.className = `rm-ad-box s${w} ad-${AD.id}`;
  box.href = AD.href; box.setAttribute('aria-label', AD.label + ' (advertisement)');
  if (AD.newTab !== false) { box.target = '_blank'; box.rel = 'sponsored noopener'; } else { box.removeAttribute('target'); box.rel = 'sponsored'; }
  box.innerHTML = AD.html(w, h);
}
function glass() { const g = room.querySelector('.glass'); return g ? g.getBoundingClientRect() : { left: 0, top: 0, width: VW, height: VH }; }
const fitTransform = g => `translate(${g.left}px,${g.top}px) scale(${g.width / VW})`;
function fitScreen() { if (roomOn) { const g = glass(); screen.style.transform = fitTransform(g); const gl = $('#glare'); Object.assign(gl.style, { left: g.left + 'px', top: g.top + 'px', width: g.width + 'px', height: g.height + 'px' }); } }
function zoomed(g) {
  const W = innerWidth, H = innerHeight, z = Math.max(W / g.width, H / g.height) * 1.04;
  const tx = W / 2 - (g.left + g.width / 2) * z, ty = H / 2 - (g.top + g.height / 2) * z;
  return { room: `translate(${tx}px,${ty}px) scale(${z})`, screen: `translate(${tx + g.left * z}px,${ty + g.top * z}px) scale(${g.width / VW * z})` };
}
function enterRoom() { roomOn = true; document.body.classList.add('in-room'); layoutRoom(); }
function exitRoom() {
  roomOn = false; document.body.classList.remove('in-room');
  room.style.transition = room.style.transform = screen.style.transition = screen.style.transform = '';
  screen.classList.remove('fadein'); void screen.offsetWidth; screen.classList.add('fadein');
}
const ZOOM = 'transform .95s cubic-bezier(.55,0,.25,1)';
async function zoomIn() {
  if (!roomOn) return;
  if (!reduceMotion()) {
    const z = zoomed(glass());
    room.style.transformOrigin = '0 0';
    room.style.transition = screen.style.transition = ZOOM;
    room.style.transform = z.room; screen.style.transform = z.screen;
    $('#glare').style.opacity = 0;
    await sleep(950);
  }
  exitRoom();
}
async function zoomOut() {
  if (roomOn) return;
  enterRoom();
  if (reduceMotion()) return;
  const g = glass(), z = zoomed(g);
  room.style.transformOrigin = '0 0';
  room.style.transition = screen.style.transition = 'none';
  room.style.transform = z.room; screen.style.transform = z.screen; $('#glare').style.opacity = 0;
  void room.offsetWidth;
  room.style.transition = screen.style.transition = ZOOM;
  room.style.transform = ''; screen.style.transform = fitTransform(g);
  await sleep(950);
  room.style.transition = screen.style.transition = ''; $('#glare').style.opacity = '';
}
function setLeds(on, busy) { room.classList.toggle('on', !!on); room.classList.toggle('busy', !!busy); }
function roomPower() {
  if (stageOn('st-sponsor') || stageOn('st-bios') || stageOn('st-splash')) { // pressing power while it boots turns it off, like a real one
    bootTok++; skipping = true; $('#skip').classList.remove('on');
    noise(0.06, { ft: 'lowpass', f: 300, vol: 0.5, decay: 1 }); setLeds(false); renderPower(); show('st-power'); return;
  }
  $('#pwr').click();
}
function initRoom() {
  document.body.append($('#skip'), $('#tw-float'), $('#tw-panel'));
  room.querySelector('.rm-ui').appendChild($('.power-box'));
  window.addEventListener('resize', () => { if (roomOn) layoutRoom(); });
  enterRoom();
}

/* ---------- startup sponsor: a short, skippable "brought to you by" screen at the first boot of a visit ---------- */
// The sponsor comes from js/ads.js (window.RETRO_SPONSOR). It plays every time a computer starts, including
// when you switch years. Raise SPONSOR_COOLDOWN_MIN to space it out (e.g. 5 = at most once every 5 minutes).
const SPONSOR_COOLDOWN_MIN = 0;
function sponsorDue() {
  const sp = window.RETRO_SPONSOR;
  if (!sp || !sp.html || !sp.href) return null;
  try {
    if (sessionStorage.getItem('r1990:sponsorOff') === '1') return null; // test scripts only
    const last = +sessionStorage.getItem('r1990:sponsorShown') || 0;
    if (last && Date.now() - last < SPONSOR_COOLDOWN_MIN * 60000) return null;
    sessionStorage.setItem('r1990:sponsorShown', String(Date.now()));
  } catch (e) {}
  return sp;
}
async function runSponsor(sp, live) {
  const st = $('#st-sponsor'), box = st.querySelector('.sp-box'), bar = st.querySelector('.sp-bar i'), skip = st.querySelector('.sp-skip');
  box.href = sp.href; box.className = 'sp-box sp-' + sp.id; box.setAttribute('aria-label', (sp.label || 'Sponsor') + ' (advertisement)');
  if (sp.newTab !== false) { box.target = '_blank'; box.rel = 'sponsored noopener'; } else { box.removeAttribute('target'); box.rel = 'sponsored'; }
  box.innerHTML = sp.html(era);
  const secs = Math.min(10, Math.max(2, sp.seconds || 10));
  let done = false; skip.onclick = () => { done = true; sfx.click(); };
  const t0 = performance.now();
  while (!done && live()) {
    const f = Math.min(1, (performance.now() - t0) / (secs * 1000));
    bar.style.width = (f * 100) + '%';
    if (f >= 1) break;
    await sleep(80);
  }
  return live();
}

/* ---------- boot / shutdown ---------- */
// How much to stretch each year's startup so power-on to desktop takes about 20 seconds (sponsor screen not included).
const BOOT_PACE = { '1985': 2.35, '1990': 1.35, '1995': 1.86, '2000': 2.5 };
let booted = false, skipping = false, bootTok = 0;
const bios = $('#bios');
async function boot() {
  const my = ++bootTok; skipping = false; booted = false;
  audio();
  bios.innerHTML = '';
  $('#skip').classList.add('on');
  const spon = sponsorDue();
  show(spon ? 'st-sponsor' : 'st-bios'); powerAnim('poweron'); setLeds(true, true);
  const live = () => my === bootTok && !skipping;
  // Each year's startup is stretched to take about BOOT_SECONDS from power-on to desktop.
  const pace = BOOT_PACE[era.id] || 1;
  const B = {
    live, sfx, tone, bios,
    wait: async ms => { await sleep(ms * pace); return live(); },
    async type(line, cls, delay = 0) {
      if (!live()) return;
      const span = document.createElement('span'); if (cls) span.className = cls; bios.appendChild(span);
      if (!delay) { span.textContent = line + '\n'; return; }
      for (const ch of line) { if (!live()) return; span.textContent += ch; if (ch !== ' ') sfx.key(); await sleep(delay * pace); }
      span.textContent += '\n';
    },
    async memTest(kb, stepKb, ms = 40) {
      const mem = document.createElement('span'); bios.appendChild(mem);
      for (let k = 0; k <= kb; k += stepKb) { if (!live()) return false; mem.textContent = `Memory Test: ${String(k).padStart(6)}K`; if (k % (stepKb * 4) === 0) tone(1800, 0.01, { vol: 0.02 }); await sleep(ms * pace); }
      mem.textContent += ' OK\n'; return true;
    },
    prompt(text) { bios.appendChild(document.createTextNode(text)); },
    clear(html = '') { bios.innerHTML = html; },
    splash() { if (!live()) return; show('st-splash'); sfx[era.sounds.start](); }
  };
  if (spon) { if (!(await runSponsor(spon, live))) return; show('st-bios'); }
  const ok = await era.boot(B);
  if (ok && live()) toDesktop();
}
function toDesktop(instant) {
  if (booted) return;
  booted = true; skipping = true;
  $('#skip').classList.remove('on'); setLeds(true, false);
  if (roomOn && !instant) { const my = bootTok; zoomIn().then(() => { if (my === bootTok && booted) finishDesk(); }); return; }
  if (roomOn) exitRoom();
  finishDesk();
}
function finishDesk() {
  show('st-desk'); idleT = Date.now();
  $$('#deskicons, #dos').forEach(x => x.remove()); dos = null;
  setupTaskbar();
  if (era.shell === 'start') buildStartShell(); else if (era.shell === 'dos') buildDosShell(); else openProgman();
  allowance();
  if (tester()) setTimeout(() => toast('Tester mode: unlimited money in this browser. Turn it off in Control Panel.'), 1600);
  // A shared home-page link (#1995&page=…) opens straight to that page, already online.
  if (HASH.page && !HASH.opened && era.apps.includes('nv')) {
    HASH.opened = true;
    setTimeout(() => { if (!booted) return; net.connected = true; net.since = Date.now(); refreshTray(); toast('Connected. Opening the home page someone shared with you…'); openBrowser(SHARE_URL); }, 700);
  }
  const pend = store.get('pending', []).filter(id => PLUGINS[id] && !isOwned(id));
  if (pend.length) setTimeout(() => { if (booted) install(PLUGINS[pend[0]]); }, 1200);
  // First visit to this year: the Quick Help guide (it replaces the old automatic Read Me).
  const firstHelp = !estore.get('seenHelp', false);
  if (firstHelp) { estore.set('seenHelp', true); estore.set('seenReadme', true); }
  const afterParty = () => { if (!booted) return; if (firstHelp) openHelp(); digCapsules(); };
  if (era.id === '2000' && !estore.get('y2kParty', false)) { estore.set('y2kParty', true); setTimeout(() => { if (booted) y2kParty(afterParty); }, 500); }
  else setTimeout(afterParty, 600);
}
function powerAnim(cls) { screen.classList.remove('poweron', 'poweroff'); void screen.offsetWidth; screen.classList.add(cls); }
$('#skip').onclick = () => { skipping = true; sfx[era.sounds.start](); toDesktop(); };
$('#pwr').onclick = () => {
  if (booted || stageOn('st-sponsor') || stageOn('st-bios') || stageOn('st-splash')) return;
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
  again.hidden = false;
  await zoomOut(); if (my !== bootTok) return;
  renderPower(); setLeds(false);
  $('#pwr').focus();
}
$('#relight').onclick = async () => {
  powerAnim('poweroff'); noise(0.08, { ft: 'lowpass', f: 300, vol: 0.5, decay: 1 });
  await sleep(500);
  screen.classList.remove('poweroff');
  booted = false; renderPower(); show('st-power');
};
window.addEventListener('resize', () => { Object.values(wins).forEach(W => { if (W.max) W.onResize && W.onResize(); }); });

/* ---------- dev hook: add ?dev to the URL to script the computer in tests ---------- */
// Reminder for app authors: every app needs a line in the Quick Help guide (a `help` field, or `tagline` for store games).
if (/[?&]dev\b/.test(location.search)) Object.values(PLUGINS).filter(p => !p.help && !p.tagline).forEach(p => console.warn(`Quick Help: app "${p.id}" has no help text. Add a help: '...' line.`));
if (/[?&]dev\b/.test(location.search)) window.RetroPuter = {
  launch: id => launchApp(id), openApp, apps: () => apps().map(a => a.id), plugins: PLUGINS,
  own: id => { store.set('owned', [...new Set([...owned(), id])]); refreshShell(); }, cash: v => setWallet(v), wallet,
  desk: () => { if (!booted) { if (!stageOn('st-bios') && !stageOn('st-splash')) boot(); skipping = true; toDesktop(true); } },
  era: () => era.id, switchEra, connect: () => { net.connected = true; refreshTray(); Object.values(wins).forEach(W => W.onNet && W.onNet()); }
};

/* ---------- start ---------- */
initRoom();
setEra(ERAS[HASH.era] ? HASH.era : store.get('era', ERAS['1990'] ? '1990' : ERA_IDS[0]));
renderPower();
})();
