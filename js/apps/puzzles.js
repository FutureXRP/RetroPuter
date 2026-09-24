/* Puzzles & business sims:
   - Sunny's Lemonade Stand: a builtin lemonade-business sim (1985 text mode, animated street in 1990+).
   - Plumber Panic: a store pipe-laying puzzle (1995). */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  const r2 = v => Math.round(v * 100) / 100;
  const money = v => (v < -0.004 ? '-' : '') + '$' + Math.abs(v).toFixed(2);
  const H = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* =====================================================================
     SUNNY'S LEMONADE STAND
     ===================================================================== */
  const WX = {
    rainy: { name: 'Rainy', t: [56, 66], traffic: 18, thirst: 0.55, ascii: ['  .--.   ', '.(    ). ', "' ' ' ' '"] },
    cloudy: { name: 'Cloudy', t: [64, 74], traffic: 40, thirst: 0.75, ascii: ['  .--.   ', '.(    ). ', '(___.__) '] },
    sunny: { name: 'Sunny', t: [76, 85], traffic: 60, thirst: 0.9, ascii: [' \\ | /   ', '-- O --  ', ' / | \\   '] },
    hot: { name: 'Hot', t: [86, 95], traffic: 72, thirst: 0.96, ascii: ['\\ \\|/ /  ', '-( O )-  ', '/ /|\\ \\  '] },
    heat: { name: 'Heat wave', t: [97, 104], traffic: 90, thirst: 1, ascii: ['~\\ | /~  ', '~( O )~  ', '~/ | \\~  '] }
  };
  const WX_ORDER = ['rainy', 'cloudy', 'sunny', 'hot', 'heat'];
  const WX_ODDS = [['sunny', 34], ['hot', 20], ['cloudy', 24], ['rainy', 14], ['heat', 8]];
  const EVENTS = [
    { id: 'fair', name: 'Street fair', text: 'The Maple Lane Street Fair is today! Big crowds all day long.', mult: 1.7, tol: 0.1, out: true, who: 'A fair visitor' },
    { id: 'soccer', name: 'Soccer game', text: 'Kids\' soccer game at Oak Park this afternoon. Lots of thirsty players after 3 PM!', mult: 1.4, tol: -0.05, out: true, rush: 0.78, who: 'A soccer player' },
    { id: 'road', name: 'Road construction', text: 'Road construction on your street. Fewer people will walk by, but the work crew gets thirsty.', mult: 0.55, tol: 0.05, crew: 8, who: 'A construction worker' },
    { id: 'parade', name: 'Bike parade', text: 'The Summer Bike Parade rolls past your corner at noon!', mult: 1.45, out: true, rush: 0.4, who: 'A parade rider' },
    { id: 'sale', name: 'Lemon sale', text: 'Grocer Greta is having a lemon sale. Lemons are cheap today!', lem: 0.6 },
    { id: 'short', name: 'Lemon shortage', text: 'The lemon truck is late. Lemons cost extra today.', lem: 1.6 },
    { id: 'books', name: 'Library book sale', text: 'Big book sale at the library. Readers get thirsty!', mult: 1.25, who: 'A reader with a stack of books' },
    { id: 'soda', name: 'Soda cart', text: 'The Fizzbee Soda Cart parked down the block. Some people will buy soda instead.', mult: 0.85, tol: -0.1 }
  ];
  const EV = id => EVENTS.find(e => e.id === id) || null;
  const SUP = [
    { k: 'lemons', name: 'Lemons', bag: 10, unit: 'lemons', base: 2.0 },
    { k: 'sugar', name: 'Sugar', bag: 20, unit: 'scoops', base: 1.2 },
    { k: 'cups', name: 'Paper cups', bag: 25, unit: 'cups', base: 0.75 },
    { k: 'ice', name: 'Ice', bag: 50, unit: 'cubes', base: 0.9 }
  ];
  const SIGN_COST = 0.25;
  const UPS = [
    { k: 'pitcher', name: 'Big Pitcher', cost: 12, text: 'Makes 12 cups instead of 8, and you can serve 30 more customers a day.', lock: G => G.day >= 2 ? '' : 'Opens on day 2' },
    { k: 'cooler', name: 'Picnic Cooler', cost: 18, text: 'Keeps 60% of your ice from melting overnight.', lock: G => G.day >= 3 ? '' : 'Opens on day 3' },
    { k: 'juicer', name: 'Lemon Juicer', cost: 25, text: 'Squeezes 50% more juice from every lemon, so each pitcher needs fewer lemons.', lock: (G, P) => P.total >= 80 ? '' : `Sell 80 cups first (${P.total} so far)` },
    { k: 'stand2', name: 'Second Stand', cost: 50, text: 'Cousin Dex runs a second stand by the park: 60% more people walk by and you can serve 50 more a day. Dex earns $2 a day.', lock: (G, P) => P.rep >= 60 ? '' : `Needs reputation 60 (now ${P.rep})` }
  ];
  const PEOPLE = ['A kid on a bike', 'The mail carrier', 'A jogger', 'Grandpa Walt', 'A dog walker', 'Two sisters', 'A skateboarder', 'Mrs. Okafor from next door', 'A pizza delivery driver', 'A teen with headphones', 'A dad with a stroller', 'The ice cream truck driver', 'A lady in a sun hat', 'A man in a suit', 'The crossing guard', 'A girl with a kite'];
  const YUM = ['Yum!', 'Just right!', 'Refreshing!', 'Delicious!', 'So good!', 'Perfect!'];
  const ISSUE = { watery: 'Too watery!', strong: 'Way too strong!', sweet: 'Too sweet!', sour: 'Too sour!', warm: 'Needs ice!', icy: 'Brain freeze!' };
  const ISSUE_TIP = {
    watery: 'Customers said "Too watery!" Put more lemons (and sugar) in each pitcher.',
    strong: 'Customers said "Way too strong!" Use fewer lemons per pitcher.',
    sweet: 'Customers said "Too sweet!" Use less sugar, or a little more lemon.',
    sour: 'Customers said "Too sour!" Add more sugar, or use a little less lemon.',
    warm: 'Customers said "Needs ice!" Hot days need more ice in each cup.',
    icy: 'Customers said "Brain freeze!" Use less ice when it is cool out.'
  };
  const SHIRTS = ['#e04040', '#4060e0', '#40a040', '#e0a020', '#a040c0', '#20a0a0', '#e06090', '#606060', '#f07020'];
  const SKIN = ['#f4d0a8', '#e0b080', '#c08858', '#8a5a34', '#5e3a20'];
  const HAIR = ['#302010', '#604020', '#c09040', '#101010', '#a03010', '#d0d0d0'];

  const wPick = list => { let t = list.reduce((a, x) => a + x[1], 0), r = Math.random() * t; for (const x of list) { if ((r -= x[1]) < 0) return x[0]; } return list[0][0]; };
  const lemN = P => P.lem.reduce((a, b) => a + b.n, 0);
  const cpp = P => P.up.pitcher ? 12 : 8;
  const idealIce = t => t < 70 ? 1 : t < 80 ? 2 : t < 90 ? 3 : 4;

  // How a cup tastes. Recipe amounts are per pitcher; strength/sweet are normalized to an 8-cup pitcher.
  function taste(P, iceUsed, temp) {
    const k = 8 / cpp(P), st = P.rec.l * (P.up.juicer ? 1.5 : 1) * k, sw = P.rec.s * k;
    const issues = [];
    let fs = 1;
    if (st < 3.5) fs = 1 - (3.5 - st) * 0.3; else if (st > 5.5) fs = 1 - (st - 5.5) * 0.25;
    if (st < 2.75) issues.push('watery'); else if (st > 6.5) issues.push('strong');
    const d = sw - st;
    const fb = Math.abs(d) <= 0.75 ? 1 : 1 - (Math.abs(d) - 0.75) * 0.3;
    if (d >= 1.5) issues.push('sweet'); else if (d <= -1.5) issues.push('sour');
    const di = iceUsed - idealIce(temp);
    let fi = 1;
    if (di < -1) fi = 1 - (-di - 1) * 0.15; else if (di > 2) fi = 1 - (di - 2) * 0.12;
    if (di <= -2 && temp >= 75) issues.push('warm'); else if (di >= 3) issues.push('icy');
    return { q: clamp(fs * fb * fi, 0.05, 1), issues, st, sw };
  }
  function tasteWords(P, temp) {
    const t = taste(P, P.rec.i, temp);
    if (!t.issues.length) return t.q > 0.92 ? 'Mmm, tastes just right for today!' : 'Tastes pretty good.';
    const w = { watery: 'weak and watery', strong: 'super strong', sweet: 'very sweet', sour: 'very sour', warm: 'not cold enough for today', icy: 'way too icy for today' };
    return 'Tastes ' + t.issues.map(i => w[i]).join(', and ') + '.';
  }
  const unitCost = (G, P) => {
    const pr = G.today.pr, n = cpp(P);
    const l = r2(P.rec.l * pr.lemons / 10 / n), s = r2(P.rec.s * pr.sugar / 20 / n), c = r2(pr.cups / 25), i = r2(P.rec.i * pr.ice / 50);
    return { l, s, c, i, all: r2(l + s + c + i) };
  };
  const canMake = P => {
    const byL = Math.floor(lemN(P) / Math.max(1, P.rec.l)), byS = Math.floor(P.sugar / Math.max(1, P.rec.s));
    return Math.min(byL * cpp(P), byS * cpp(P), P.cups);
  };

  function newPlayer(name) {
    return { name, cash: 20, lem: [], sugar: 0, cups: 0, ice: 0, rec: { l: 3, s: 3, i: 2 }, price: 0.5, signs: 2, rep: 40, up: {}, hist: [], total: 0, news: [], buy: { lemons: 0, sugar: 0, cups: 0, ice: 0 }, upSpent: 0 };
  }
  function genDay(G) {
    const prev = G.today;
    const f = G.day === 1 ? 'sunny' : G.day === 2 ? pickA(['sunny', 'hot', 'cloudy']) : wPick(WX_ODDS);
    let w = f;
    if (G.day > 1 && Math.random() < 0.2) { const i = WX_ORDER.indexOf(f); w = WX_ORDER[clamp(i + (Math.random() < 0.5 ? -1 : 1), 0, 4)]; }
    let ev = null;
    if (G.day > 1 && Math.random() < 0.45) { do { ev = pickA(EVENTS).id; } while (prev && prev.ev === ev); }
    const E = EV(ev), pr = {};
    SUP.forEach(s => {
      let p = s.base * rnd(0.85, 1.2);
      if (s.k === 'lemons' && E && E.lem) p *= E.lem;
      if (s.k === 'ice') p *= w === 'heat' ? 1.35 : w === 'hot' ? 1.15 : 1;
      pr[s.k] = Math.max(0.3, Math.round(p * 20) / 20);
    });
    G.today = { f, w, temp: ri(WX[w].t[0], WX[w].t[1]), ev, pr };
  }
  function overnight(G, P) {
    P.news = [];
    if (P.ice) {
      const keep = P.up.cooler ? Math.floor(P.ice * 0.6) : 0;
      P.news.push(keep ? `Your cooler saved ${keep} of your ${P.ice} ice cubes. The rest melted.` : `Your ${P.ice} ice cubes melted overnight.`);
      P.ice = keep;
    }
    let bad = 0;
    P.lem = P.lem.filter(b => { if (G.day - b.d >= 4) { bad += b.n; return false; } return true; });
    if (bad) P.news.push(`${bad} old lemon${bad > 1 ? 's' : ''} went bad. Into the compost bin!`);
    P.buy = { lemons: 0, sugar: 0, cups: 0, ice: 0 }; P.upSpent = 0;
    if (P.cash < 3 && canMake(P) < 8) { P.cash = r2(P.cash + 5); P.gift = (P.gift || 0) + 5; P.news.push('Aunt June saw your empty pantry and gave you $5.00 to get going again. (Gifts don\'t count as profit.)'); }
  }
  const spoilSoon = (G, P) => P.lem.filter(b => G.day - b.d === 3).reduce((a, b) => a + b.n, 0);
  function useLemons(P, n) {
    P.lem.sort((a, b) => a.d - b.d);
    for (const b of P.lem) { const t = Math.min(b.n, n); b.n -= t; n -= t; if (!n) break; }
    P.lem = P.lem.filter(b => b.n > 0);
  }

  // Run one business day for one player. Returns the full result (also used to replay the animation).
  function simulate(G, P) {
    const T = G.today, W = WX[T.w], E = EV(T.ev), temp = T.temp;
    let emult = E && E.mult ? E.mult : 1;
    const rained = E && E.out && T.w === 'rainy';
    if (rained) emult = 1 + (emult - 1) * 0.35;
    const traffic = Math.round(W.traffic * emult * (P.up.stand2 ? 1.6 : 1) * rnd(0.85, 1.15) * (0.9 + P.rep / 400));
    const cap = 60 + (P.up.pitcher ? 30 : 0) + (P.up.stand2 ? 50 : 0);
    const notice = clamp(0.4 + 0.45 * (1 - Math.exp(-P.signs / 3)) + (P.rep - 40) / 300, 0.15, 0.97);
    const cust = [];
    const base = E && E.rush ? Math.round(traffic / emult) : traffic;
    for (let i = 0; i < traffic; i++) {
      const rush = E && E.rush && i >= base;
      cust.push({ t: rush ? clamp(E.rush + rnd(-0.06, 0.08), 0.02, 0.98) : rnd(0.01, 0.98), who: rush || (E && E.who && Math.random() < 0.25) ? E.who : pickA(PEOPLE) });
    }
    if (E && E.crew) for (let i = 0; i < E.crew; i++) cust.push({ t: pickA([0.37, 0.38, 0.39, 0.4, 0.41]) + rnd(0, 0.03), who: E.who, crew: true });
    cust.sort((a, b) => a.t - b.t);
    let lem = lemN(P), sugar = P.sugar, cups = P.cups, ice = P.ice, left = 0, sold = 0, rev = 0, qSum = 0, pitchers = 0, lemUsed = 0;
    let soldOut = '', missed = 0, pricey = 0, meh = 0, line = 0;
    const comp = {};
    const perCup = cpp(P);
    cust.forEach(c => {
      c.skin = pickA(SKIN); c.shirt = pickA(SHIRTS); c.hair = pickA(HAIR); c.dir = Math.random() < 0.5 ? 1 : -1; c.kid = /kid|sisters|skate|soccer|girl/i.test(c.who);
      if (!c.crew && Math.random() > notice) { c.stop = false; return; }
      c.stop = true;
      if (!c.crew && Math.random() > W.thirst) { c.say = pickA(['Not thirsty.', 'Maybe later.', 'No thanks!']); meh++; return; }
      const tol = (0.3 + Math.max(0, temp - 60) * 0.013 + P.rep * 0.003 + (E && E.tol ? E.tol : 0)) * rnd(0.75, 1.3) + (c.crew ? 0.3 : 0);
      if (P.price > tol + 0.001) { c.say = pickA(['Too pricey!', 'How much?!', 'Too pricey!']); pricey++; return; }
      if (soldOut) { c.say = 'Sold out?!'; missed++; return; }
      if (sold >= cap) { c.say = 'Line too long!'; line++; return; }
      if (!left) {
        if (lem >= P.rec.l && sugar >= P.rec.s) { lem -= P.rec.l; lemUsed += P.rec.l; sugar -= P.rec.s; left = perCup; pitchers++; }
        else { soldOut = lem < P.rec.l ? 'lemons' : 'sugar'; c.say = 'Sold out?!'; missed++; return; }
      }
      if (cups < 1) { soldOut = 'cups'; c.say = 'No cups?!'; missed++; return; }
      cups--; left--;
      const iu = Math.min(ice, P.rec.i); ice -= iu;
      const t = taste(P, iu, temp);
      sold++; rev += P.price; qSum += t.q; c.buy = true;
      if (t.issues.length) { const is = pickA(t.issues); comp[is] = (comp[is] || 0) + 1; c.say = ISSUE[is]; }
      else c.say = t.q > 0.9 ? pickA(YUM) : pickA(['Pretty good.', 'Not bad!', 'Nice.']);
    });
    const avgQ = sold ? qSum / sold : 0;
    let dRep = sold ? Math.round((avgQ - 0.7) * 30 * Math.min(1, sold / 12)) : 0;
    dRep -= Math.min(6, Math.floor((missed + line) / 5));
    if (pricey > sold && pricey > 5) dRep -= 1;
    const signCost = r2(P.signs * SIGN_COST), wage = P.up.stand2 ? 2 : 0;
    const sup = r2(SUP.reduce((a, s) => a + P.buy[s.k] * T.pr[s.k], 0));
    const exp = r2(sup + signCost + wage + P.upSpent);
    rev = r2(rev);
    // apply
    useLemons(P, lemUsed);
    P.sugar = sugar; P.cups = cups; P.ice = ice;
    P.cash = r2(P.cash + rev - signCost - wage);
    P.rep = clamp(P.rep + dRep, 0, 100);
    P.total += sold;
    const res = { day: G.day, name: P.name, w: T.w, f: T.f, temp, ev: T.ev, rained, traffic, sold, rev, sup, signCost, signs: P.signs, wage, ups: P.upSpent, exp, prof: r2(rev - exp), price: P.price, missed, soldOut, pricey, meh, line, cap, comp, avgQ, dRep, rep: P.rep, pitchers, cust };
    P.hist.push({ d: G.day, rev, exp, prof: res.prof, sold, w: T.w });
    return res;
  }
  function tipFor(r) {
    const comps = Object.entries(r.comp).sort((a, b) => b[1] - a[1]);
    if (r.soldOut && r.missed >= 3) return `You ran out of ${r.soldOut}! ${r.missed} more people wanted lemonade. Buy more supplies next time.`;
    if (r.line >= 3) return `${r.line} people left because the line was too long. A Big Pitcher or a Second Stand lets you serve more.`;
    if (comps.length && comps[0][1] >= Math.max(2, r.sold * 0.25)) return ISSUE_TIP[comps[0][0]];
    if (r.pricey > Math.max(3, r.sold * 0.4)) return `${r.pricey} people said "Too pricey!" Try a lower price, or wait for a hotter day.`;
    if (r.prof < 0 && r.w === 'rainy') return 'Rainy days are slow. When rain is in the forecast, buy fewer supplies.';
    if (r.prof < 0) return 'You spent more than you earned today. Buy only what you think you can sell.';
    if (r.pricey === 0 && r.sold >= 15) return 'Nobody said "Too pricey!" You might be able to charge a little more.';
    if (r.signs < 2) return 'More signs help people notice your stand.';
    return 'Great day! Keep your recipe tasty and your prices fair.';
  }

  const LEM_ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="24" width="28" height="6" fill="#a0522d" stroke="#000"/><rect x="4" y="12" width="24" height="12" fill="#deb887" stroke="#000"/><g fill="#ffe000"><rect x="2" y="4" width="4" height="6"/><rect x="10" y="4" width="4" height="6"/><rect x="18" y="4" width="4" height="6"/><rect x="26" y="4" width="4" height="6"/></g><g fill="#fff"><rect x="6" y="4" width="4" height="6"/><rect x="14" y="4" width="4" height="6"/><rect x="22" y="4" width="4" height="6"/></g><rect x="2" y="4" width="28" height="6" fill="none" stroke="#000"/><rect x="8" y="15" width="5" height="7" fill="#fff8a0" stroke="#000"/><rect x="18" y="14" width="7" height="6" fill="#ffe000" stroke="#000"/><rect x="20" y="15" width="3" height="1" fill="#fff"/></svg>';

  const LEM_CSS = `
    .lem{height:100%;display:flex;flex-direction:column;background:#fffbe0;color:#000;font-size:13px;user-select:none;-webkit-user-select:none}
    .lem-top{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;padding:4px 8px;background:#ffd21f;border-bottom:2px solid #a07800;font-weight:bold}
    .lem-top .lem-ttl{flex:1;min-width:130px}
    .lem-main{flex:1;min-height:0;overflow:auto;padding:8px 10px}
    .lem-foot{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;padding:6px 8px;border-top:1px solid #d0b050;background:#fff3b0}
    .lem-foot[hidden]{display:none}
    .lem-foot .btn{min-height:36px;min-width:0;touch-action:manipulation}
    .lem-foot .lem-pri{font-weight:bold}
    .lem h2{margin:0 0 6px;font-size:17px;color:#7a4a00}
    .lem h3{margin:10px 0 4px;font-size:14px;color:#7a4a00}
    .lem p{margin:4px 0;line-height:1.35}
    .lem-box{background:#fff;padding:6px 8px;margin:6px 0}
    .lem-row2{display:flex;gap:10px;flex-wrap:wrap}
    .lem-row2>*{flex:1 1 200px}
    .lem-wx{display:flex;gap:10px;align-items:center}
    .lem-wx svg{width:56px;height:56px;flex:none}
    .lem-news{color:#8a2000}
    .lem-tbl{width:100%;max-width:640px;border-collapse:collapse}
    .lem-tbl td,.lem-tbl th{padding:3px 4px;text-align:left;vertical-align:middle}
    .lem-tbl th{font-size:12px;color:#7a4a00;border-bottom:1px solid #d0b050}
    .lem-tbl td.n,.lem-tbl th.n{text-align:right;white-space:nowrap}
    .lem-adj{cursor:pointer}
    .lem-adj.on{background:#fff0a0;outline:1px dotted #7a4a00}
    .lem-st{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
    .lem-st .btn{min-width:36px;min-height:36px;padding:0;font-weight:bold;font-size:16px;touch-action:manipulation}
    .lem-st b{display:inline-block;min-width:44px;text-align:center}
    .lem-ok{color:#006000}.lem-bad{color:#b00000}
    .lem-big{font-size:18px;font-weight:bold}
    .lem-title{text-align:center;padding:10px 0}
    .lem-title .lem-logo{font:bold 30px/1.05 Georgia,"Times New Roman",serif;color:#d08000;text-shadow:2px 2px 0 #7a4a00;margin:6px 0}
    .lem-title svg{width:200px;max-width:70%;height:auto}
    .lem-menu{display:flex;flex-direction:column;gap:6px;max-width:300px;margin:10px auto}
    .lem-menu .btn{min-height:40px;font-size:14px}
    .lem-choice{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px}
    .lem-choice .btn{min-height:38px;min-width:90px}
    .lem-choice .btn[aria-pressed=true]{border-color:#000 #fff #fff #000;background:#ffe36a;font-weight:bold}
    .lem input[type=text]{font-size:14px;padding:4px;width:170px;max-width:100%}
    .lem-street{position:relative;width:100%;background:#000}
    .lem-street canvas{display:block;width:100%}
    .lem-simbar{display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;padding:6px 2px;font-weight:bold}
    .lem-chart{width:100%;max-width:460px;height:auto;display:block;background:#fff}
    .lem-pre{white-space:pre;font-family:inherit;margin:0;overflow-x:auto}
    .lem-log{height:230px;overflow:auto;white-space:pre-wrap;padding:4px 6px}
    .lem-up{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-bottom:1px dotted #c0a040;padding:6px 0}
    .lem-up div{flex:1 1 200px}
    .lem-up .btn{min-height:36px}
    .lem-eq{font-size:15px;background:#fff8c8;border:1px dashed #a07800;padding:6px 8px;margin:6px 0}
    .lem-help p{margin:6px 0}
    .lem-85{background:#000;color:var(--phos,#33ff66);font:18px/1.2 var(--dos)}
    .lem-85 .lem-top{background:var(--phos,#33ff66);color:#000;border:0;font-weight:normal}
    .lem-85 .lem-foot{background:#000;border-top:1px solid var(--phos,#33ff66)}
    .lem-85 .lem-foot .btn{min-height:34px}
    .lem-85 h2,.lem-85 h3{color:#000;background:var(--phos,#33ff66);display:inline-block;padding:0 6px;font:inherit}
    .lem-85 .lem-box{background:#000;border:1px solid var(--phos,#33ff66)}
    .lem-85 .lem-news,.lem-85 .lem-ok,.lem-85 .lem-bad,.lem-85 .lem-tbl th{color:inherit}
    .lem-85 .lem-bad{text-decoration:underline}
    .lem-85 .lem-tbl th{border-bottom:1px solid var(--phos,#33ff66);font-size:inherit}
    .lem-85 .lem-adj.on{background:var(--phos,#33ff66);color:#000;outline:0}
    .lem-85 .lem-adj.on .btn{border-color:#000;color:#000;background:var(--phos,#33ff66)}
    .lem-85 .lem-st .btn{font-size:18px}
    .lem-85 .lem-eq{background:#000;border:1px dashed var(--phos,#33ff66)}
    .lem-85 .lem-title .lem-logo{font:inherit;color:inherit;text-shadow:none}
    .lem-85 .lem-choice .btn[aria-pressed=true]{background:var(--phos,#33ff66);color:#000}
    .lem-85 .lem-up{border-bottom:1px dashed var(--phos,#33ff66)}
    .lem-85 .lem-log{border:1px solid var(--phos,#33ff66);height:calc(100vh - 290px);min-height:200px}
    .lem-85 .lem-menu .btn,.lem-85 .lem-eq,.lem-85 .lem-big,.lem-85 input[type=text]{font-size:inherit}
    .lem-title .lem-pre{display:inline-block;text-align:left;max-width:100%}
    .lem-85 .lem-title .lem-pre{font-size:clamp(9px,4vw,18px);overflow:hidden}
    .lem-85 .lem-cur::after{content:'_';animation:lemblink 1s steps(1) infinite}
    @keyframes lemblink{50%{opacity:0}}
    @media (max-width:420px){.lem-tbl td,.lem-tbl th{padding:2px}.lem-st .btn{min-width:34px}.lem-st b{min-width:36px}}
  `;

  const TITLE_ART = [
    ' ' + '_'.repeat(34),
    '|' + ' '.repeat(34) + '|',
    '|   ' + "S U N N Y ' S".padEnd(31) + '|',
    '|   ' + 'L E M O N A D E   S T A N D'.padEnd(31) + '|',
    '|' + '_'.repeat(34) + '|',
    '  ||    .-""-.        .-----.  ||',
    '  ||   ( LEMON )      | ICE |  ||',
    "  ||    '-..-'        '-----'  ||",
    '__||___________________________||__'
  ].map(l => l.padEnd(36)).join('\n');

  function wxSvg(w) {
    const sun = (c, r) => `<circle cx="28" cy="26" r="${r}" fill="${c}" stroke="#a06000"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="27" y="4" width="3" height="7" fill="${c}" transform="rotate(${a} 28 26)"/>`).join('');
    const cloud = c => `<g fill="${c}" stroke="#555"><ellipse cx="22" cy="34" rx="14" ry="9"/><ellipse cx="36" cy="30" rx="13" ry="11"/><ellipse cx="44" cy="37" rx="10" ry="7"/></g>`;
    let g = '';
    if (w === 'sunny') g = sun('#ffd800', 10);
    else if (w === 'hot') g = sun('#ffa000', 12);
    else if (w === 'heat') g = sun('#ff5a00', 13) + '<path d="M6 50q5-4 10 0t10 0 10 0 10 0" stroke="#e03000" stroke-width="2" fill="none"/>';
    else if (w === 'cloudy') g = sun('#ffd800', 8) + cloud('#e8e8e8');
    else g = cloud('#a8a8b8') + '<g stroke="#2060e0" stroke-width="2">' + [14, 24, 34, 44].map(x => `<line x1="${x}" y1="46" x2="${x - 3}" y2="54"/>`).join('') + '</g>';
    return `<svg viewBox="0 0 56 56" aria-hidden="true">${g}</svg>`;
  }

  function openLemonade(W, api) {
    const T85 = api.era.id === '1985';
    let opts = Object.assign({ sound: true, fast: false }, api.load('opts', {}));
    let G = api.load('game', null);
    let hi = api.load('hi', []);
    let scr = 'title', sel = 0, simTimer = 0, raf = 0, simState = null, closed = false, flash = '';
    let setup = { len: 14, n: 1, names: ['Sunny', 'Pepper'] };
    const snd = f => { if (opts.sound) try { f(); } catch (e) {} };
    const cha = () => snd(() => { api.tone(1568, 0.05, { vol: 0.04 }); api.tone(2093, 0.12, { vol: 0.04, at: 0.05 }); });

    W.body.innerHTML = `<div class="lem${T85 ? ' lem-85' : ''}"><div class="lem-top"></div><div class="lem-main"></div><div class="lem-foot"></div></div>`;
    const root = W.body.firstChild, top = root.querySelector('.lem-top'), main = root.querySelector('.lem-main'), foot = root.querySelector('.lem-foot');
    const cur = () => G.players[G.turn];

    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New season', fn: () => go('setup') },
        { label: 'Continue season', fn: resume, disabled: !G || G.over },
        { label: 'High scores', fn: () => go('hi') },
        '-', { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
        { label: (opts.fast ? '[x] ' : '[ ] ') + 'Fast days', fn: () => { opts.fast = !opts.fast; api.save('opts', opts); } }
      ] },
      { label: 'Help', items: [
        { label: 'How to play', fn: () => go('help') },
        { label: 'About', fn: () => api.msgBox("Sunny's Lemonade Stand", "Sunny's Lemonade Stand\nVersion 1.2\n\nRun your own lemonade stand on Maple Lane. Watch the weather, buy supplies, mix the perfect recipe and see if you can turn a profit!\n\nProfit = money in - money out.") }
      ] }
    ]);

    const save = () => { if (G) api.save('game', G); };
    const btn = (label, a, key, pri) => `<button class="btn${pri ? ' lem-pri' : ''}" data-a="${a}"${key ? ` data-key="${key}"` : ''}>${T85 && key ? `[${key === 'Enter' ? 'Enter' : key.toUpperCase()}] ` : ''}${label}</button>`;
    const stepper = (k, val, i) => `<span class="lem-st"><button class="btn" data-a="dec" data-k="${k}" aria-label="Less">-</button><b>${val}</b><button class="btn" data-a="inc" data-k="${k}" aria-label="More">+</button></span>`;

    function go(s) { scr = s; sel = 0; if (G && !G.over && ['morning', 'shop', 'recipe', 'ups', 'report', 'hand', 'dayres', 'end'].includes(s)) G.ph = s; save(); render(); }
    function resume() { if (!G || G.over) return go('setup'); go(['report', 'hand', 'dayres', 'end'].includes(G.ph) ? G.ph : 'morning'); }

    function header() {
      if (G && (scr === 'dayres' || scr === 'end')) { top.innerHTML = `<span class="lem-ttl">SUNNY'S LEMONADE STAND</span><span>Day ${G.day}/${G.len}</span>`; return; }
      if (!G || ['title', 'setup', 'hi', 'help'].includes(scr)) { top.innerHTML = `<span class="lem-ttl">SUNNY'S LEMONADE STAND</span>`; return; }
      const P = cur(), T = G.today;
      top.innerHTML = `<span class="lem-ttl">${H(P.name)}'s Stand</span><span>Day ${G.day}/${G.len}</span><span>${WX[T.f].name} ${WX[T.f].t[0]}-${WX[T.f].t[1]}F</span><span>Cash ${money(P.cash)}</span>`;
    }

    function render() {
      stopSim();
      header();
      const f = SCREENS[scr] || SCREENS.title;
      const o = f();
      main.innerHTML = o.body;
      foot.innerHTML = o.foot || '';
      foot.hidden = !o.foot;
      main.scrollTop = 0;
      if (o.after) o.after();
      markSel();
    }
    function markSel() {
      const rows = [...main.querySelectorAll('.lem-adj')];
      rows.forEach((r, i) => r.classList.toggle('on', i === sel));
    }

    /* ---------- screens ---------- */
    const SCREENS = {
      title() {
        const art = T85
          ? `<pre class="lem-pre">${H(TITLE_ART)}</pre>`
          : `<svg viewBox="0 0 150 90" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="80" width="150" height="10" fill="#6a4"/><rect x="25" y="44" width="100" height="36" fill="#c8864a" stroke="#000"/><rect x="30" y="50" width="90" height="12" fill="#fff" stroke="#000"/><text x="75" y="59" font-size="9" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#c08000">LEMONADE</text><rect x="28" y="18" width="4" height="26" fill="#8a5a2a"/><rect x="118" y="18" width="4" height="26" fill="#8a5a2a"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${20 + i * 14}" y="10" width="14" height="10" fill="${i % 2 ? '#fff' : '#ffd800'}" stroke="#000"/>`).join('')}<rect x="95" y="34" width="12" height="10" fill="#fff8a0" stroke="#000"/><ellipse cx="45" cy="38" rx="9" ry="6" fill="#ffe000" stroke="#000"/><rect x="60" y="30" width="16" height="14" fill="#fff8a0" stroke="#000"/></svg>`;
        const canC = G && !G.over;
        return {
          body: `<div class="lem-title">${art}<div class="lem-logo">${T85 ? '' : "Sunny's Lemonade Stand"}</div><p>Run a lemonade stand on Maple Lane. Can you make a profit?</p>
            <div class="lem-menu">${canC ? btn(`Continue season (day ${G.day} of ${G.len})`, 'cont', 'c', true) : ''}${btn('New season', 'setup', 'n', !canC)}${btn('How to play', 'help', 'h')}${btn('High scores', 's_hi', 's')}</div></div>`,
          foot: ''
        };
      },
      setup() {
        return {
          body: `<h2>New season</h2>
            <p>How long is summer?</p><div class="lem-choice">${[14, 30].map(n => `<button class="btn" data-a="len" data-v="${n}" aria-pressed="${setup.len === n}">${n} days</button>`).join('')}</div>
            <p>How many players? (Two players take turns on this computer.)</p><div class="lem-choice">${[1, 2].map(n => `<button class="btn" data-a="np" data-v="${n}" aria-pressed="${setup.n === n}">${n} player${n > 1 ? 's' : ''}</button>`).join('')}</div>
            <p>Stand owner${setup.n > 1 ? 's' : ''}:</p>${[0, 1].slice(0, setup.n).map(i => `<p><label>Player ${i + 1}: <input type="text" maxlength="12" data-i="${i}" value="${H(setup.names[i])}"></label></p>`).join('')}
            <p>Everybody starts with $20.00 and an empty pantry.</p>`,
          foot: btn('Back', 'title', 'b') + btn('Start the season!', 'start', 'Enter', true)
        };
      },
      help() {
        return {
          body: `<div class="lem-help"><h2>How to play</h2>
            <p>You run a lemonade stand for a summer. Every day you:</p>
            <p>1. Check the <b>weather forecast</b> and today's <b>local event</b>. Hot days and street fairs bring thirsty crowds. Rain keeps people home. (Forecasts are right most of the time, but not always!)</p>
            <p>2. <b>Buy supplies</b> at Grocer Greta's Market: lemons, sugar, cups and ice. Prices change every day. Ice melts overnight, and lemons go bad after 4 days, so don't buy too much.</p>
            <p>3. <b>Mix your recipe</b>: lemons and sugar per pitcher, ice per cup. Try a taste test! Keep lemons and sugar about equal. Hotter days need more ice.</p>
            <p>4. Set your <b>price</b> and make <b>signs</b> (25 cents each) so people notice your stand.</p>
            <p>5. <b>Open the stand</b> and watch the customers. They'll tell you what they think: "Too sour!", "Too pricey!", "Yum!"</p>
            <p>Happy customers raise your <b>reputation</b>, and a good reputation brings more customers who will pay a bit more.</p>
            <p><b>Profit = money in - money out.</b> Money in is what you sell. Money out is what you spend on supplies, signs and upgrades.</p>
            <p>Save up for <b>upgrades</b>: a Big Pitcher, a Picnic Cooler, a Lemon Juicer and even a Second Stand.</p>
            <p>At the end of the season you earn $1 of real play money for every $10 of profit (up to $6).</p>
            <p>Keys: Up/Down pick a line, Left/Right or - and + change it, Enter goes on.${T85 ? ' Esc quits.' : ''}</p></div>`,
          foot: btn('OK', G && !G.over && G.ph !== 'setup' && scr !== 'title' ? 'back' : 'title', 'Enter', true)
        };
      },
      hi() {
        const rows = hi.length ? hi.map((x, i) => `<tr><td>${i + 1}.</td><td>${H(x.n)}</td><td>${x.len} days</td><td class="n">${money(x.p)}</td></tr>`).join('') : '<tr><td colspan="4">No seasons yet. Be the first!</td></tr>';
        return { body: `<h2>Best seasons</h2><table class="lem-tbl"><tr><th></th><th>Name</th><th>Season</th><th class="n">Profit</th></tr>${rows}</table>`, foot: btn('OK', 'title', 'Enter', true) };
      },
      morning() {
        const P = cur(), T = G.today, E = EV(T.ev), soon = spoilSoon(G, P);
        const wx = T85 ? `<pre class="lem-pre">${WX[T.f].ascii.join('\n')}</pre>` : wxSvg(T.f);
        return {
          body: `<h2>Good morning, ${H(P.name)}! Day ${G.day} of ${G.len}</h2>
            <div class="lem-row2"><div class="lem-box sunken lem-wx">${wx}<div><b>Forecast: ${WX[T.f].name}</b><br>${WX[T.f].t[0]} to ${WX[T.f].t[1]} degrees F</div></div>
            <div class="lem-box sunken"><b>${E ? 'Today: ' + E.name : 'Around town'}</b><br>${E ? H(E.text) : 'Nothing special on Maple Lane today.'}</div></div>
            ${P.news.length || soon ? `<div class="lem-box sunken lem-news">${P.news.map(n => `<p>${H(n)}</p>`).join('')}${soon ? `<p>${soon} lemon${soon > 1 ? 's' : ''} will go bad tomorrow. Use them today!</p>` : ''}</div>` : ''}
            <h3>Your pantry</h3>
            <table class="lem-tbl"><tr><td>Lemons</td><td class="n">${lemN(P)}</td><td>Sugar</td><td class="n">${P.sugar} scoops</td></tr><tr><td>Cups</td><td class="n">${P.cups}</td><td>Ice</td><td class="n">${P.ice} cubes</td></tr>
            <tr><td>Cash</td><td class="n">${money(P.cash)}</td><td>Reputation</td><td class="n">${P.rep}/100</td></tr></table>
            ${P.hist.length ? `<p>Yesterday's profit: <b class="${P.hist[P.hist.length - 1].prof >= 0 ? 'lem-ok' : 'lem-bad'}">${money(P.hist[P.hist.length - 1].prof)}</b>. Season so far: <b>${money(P.cash - 20 - (P.gift || 0))}</b></p>` : '<p>Tip: start small. Buy enough for about 30 cups on your first day.</p>'}`,
          foot: btn('Upgrades', 'ups', 'u') + btn('Go shopping', 'shop', 'Enter', true)
        };
      },
      shop() {
        const P = cur(), T = G.today, ms = canMake(P);
        const rows = SUP.map((s, i) => `<tr class="lem-adj" data-i="${i}"><td><b>${s.name}</b><br><small>${s.bag} ${s.unit}: ${money(T.pr[s.k])}</small></td><td class="n">${s.k === 'lemons' ? lemN(P) : P[s.k]}</td><td class="n">${stepper(s.k, P.buy[s.k])}</td></tr>`).join('');
        return {
          body: `<h2>Grocer Greta's Market</h2>
            <p>Tap + to buy a bag, - to put one back. Cash: <b class="lem-big">${money(P.cash)}</b></p>
            <table class="lem-tbl"><tr><th>Item and price per bag</th><th class="n">You have</th><th class="n">Bags today</th></tr>${rows}</table>
            <div class="lem-eq">Spent today: <b>${money(SUP.reduce((a, s) => a + P.buy[s.k] * T.pr[s.k], 0))}</b><br>
            One pitcher of your recipe uses ${P.rec.l} lemons and ${P.rec.s} sugar and makes ${cpp(P)} cups. Each cup gets ${P.rec.i} ice.<br>
            You have enough for about <b>${ms}</b> cups${P.rec.i && Math.floor(P.ice / P.rec.i) < ms ? ` (but only enough ice for ${Math.floor(P.ice / P.rec.i)})` : ''}.</div>
            ${flash ? `<p class="lem-bad">${H(flash)}</p>` : ''}`,
          foot: btn('Back', 'morning', 'b') + btn('Next: recipe', 'recipe', 'Enter', true)
        };
      },
      recipe() {
        const P = cur(), T = G.today, uc = unitCost(G, P);
        const rows = [
          ['l', 'Lemons per pitcher', P.rec.l], ['s', 'Sugar per pitcher (scoops)', P.rec.s], ['i', 'Ice per cup (cubes)', P.rec.i],
          ['p', 'Price per cup', money(P.price)], ['g', `Signs (${money(SIGN_COST)} each)`, P.signs]
        ].map((r, i) => `<tr class="lem-adj" data-i="${i}"><td>${r[1]}</td><td class="n">${stepper(r[0], r[2])}</td></tr>`).join('');
        const per = P.price - uc.all;
        return {
          body: `<h2>Mix it up</h2>
            <p>Forecast: <b>${WX[T.f].name}, ${WX[T.f].t[0]}-${WX[T.f].t[1]}F</b>. Pitcher makes ${cpp(P)} cups.${P.up.juicer ? ' (Juicer: +50% juice)' : ''}</p>
            <table class="lem-tbl">${rows}</table>
            <div class="lem-box sunken"><b>Taste test:</b> ${tasteWords(P, WX[T.f].t[0] + 4)}</div>
            <div class="lem-eq">Cost of one cup: lemons ${money(uc.l)} + sugar ${money(uc.s)} + cup ${money(uc.c)} + ice ${money(uc.i)} = <b>${money(uc.all)}</b><br>
            You sell it for ${money(P.price)}, so each cup earns <b class="${per >= 0 ? 'lem-ok' : 'lem-bad'}">${money(per)}</b>.<br>
            Signs cost ${money(P.signs * SIGN_COST)} today.</div>`,
          foot: btn('Back', 'shop', 'b') + btn('Open the stand!', 'open', 'Enter', true)
        };
      },
      ups() {
        const P = cur();
        const rows = UPS.map(u => {
          const l = u.lock(G, P), own = P.up[u.k];
          return `<div class="lem-up"><div><b>${u.name}</b> - ${money(u.cost)}<br><small>${u.text}</small></div>${own ? '<b class="lem-ok">Owned</b>' : l ? `<small class="lem-bad">${H(l)}</small>` : btn('Buy', 'buyup" data-k="' + u.k, '', false)}</div>`;
        }).join('');
        return { body: `<h2>Upgrades</h2><p>Cash: <b>${money(P.cash)}</b>. Upgrades cost money today but can earn more later. That's called an investment!</p>${rows}${flash ? `<p class="lem-bad">${H(flash)}</p>` : ''}`, foot: btn('Done', 'morning', 'Enter', true) };
      },
      sim() {
        const r = simState.res, P = cur();
        if (T85) return { body: `<h2>Day ${G.day}: ${WX[r.w].name}, ${r.temp}F</h2><p>${H(P.name)}'s stand is open for business!</p><div class="lem-log" aria-live="off"></div><div class="lem-simbar"><span class="lem-clock">9:00 AM</span><span class="lem-sold">Sold 0</span><span class="lem-cash">$0.00</span></div>`, foot: btn('Skip to end of day', 'skip', 'Enter', true), after: startSim };
        return { body: `<div class="lem-street sunken"><canvas></canvas></div><div class="lem-simbar"><span class="lem-clock">9:00 AM</span><span class="lem-sold">Sold 0</span><span class="lem-cash">$0.00</span></div><p class="lem-said"></p><p><small>Price ${money(r.price)}. Recipe: ${P.rec.l} lemons and ${P.rec.s} sugar per pitcher, ${P.rec.i} ice per cup. Signs: ${r.signs}.</small></p>`, foot: btn('Faster', 'faster', 'f') + btn('Skip to end of day', 'skip', 'Enter', true), after: startSim };
      },
      report() {
        const r = G.pend, P = G.players.find(p => p.name === r.name) || cur();
        const E = EV(r.ev);
        const lines = [];
        if (r.f !== r.w) lines.push(`The forecast said ${WX[r.f].name}, but it turned out ${WX[r.w].name}!`);
        if (r.rained && E) lines.push(`The rain kept the ${E.name.toLowerCase()} crowd small.`);
        lines.push(`${r.traffic} people walked by. ${r.sold} bought a cup.`);
        if (r.pricey) lines.push(`${r.pricey} thought it was too pricey.`);
        if (r.missed) lines.push(`${r.missed} came after you ran out of ${r.soldOut}.`);
        if (r.line) lines.push(`${r.line} left because the line was too long.`);
        const out = [];
        if (r.sup) out.push(`supplies ${money(r.sup)}`);
        if (r.signCost) out.push(`signs ${money(r.signCost)}`);
        if (r.wage) out.push(`Dex's pay ${money(r.wage)}`);
        if (r.ups) out.push(`upgrades ${money(r.ups)}`);
        const moods = r.sold ? (r.avgQ > 0.9 ? 'loved' : r.avgQ > 0.75 ? 'liked' : r.avgQ > 0.55 ? 'were so-so about' : 'did not like') : '';
        return {
          body: `<h2>Day ${r.day} report: ${H(r.name)}</h2>
            <p>${WX[r.w].name}, ${r.temp}F. ${lines.join(' ')}</p>
            <table class="lem-tbl">
              <tr><td>Money in (sales)</td><td>${r.sold} cup${r.sold === 1 ? '' : 's'} x ${money(r.price)}</td><td class="n lem-ok">${money(r.rev)}</td></tr>
              <tr><td>Money out</td><td>${out.join(', ') || 'nothing'}</td><td class="n lem-bad">${money(r.exp)}</td></tr>
            </table>
            <div class="lem-eq">Profit = money in - money out<br><span class="lem-big">${money(r.rev)} - ${money(r.exp)} = <span class="${r.prof >= 0 ? 'lem-ok' : 'lem-bad'}">${money(r.prof)}</span></span>${r.prof < 0 ? '<br>That is a loss (less than zero). It happens! Tomorrow is a new day.' : ''}</div>
            <p>${r.sold ? `Customers ${moods} your lemonade. ` : ''}Reputation: ${r.rep}/100 (${r.dRep >= 0 ? '+' : ''}${r.dRep}). Cash now: <b>${money(P.cash)}</b></p>
            <p><b>Sunny's tip:</b> ${H(tipFor(r))}</p>
            <h3>Profit each day</h3>${chart(P)}`,
          foot: btn('Next', 'next', 'Enter', true)
        };
      },
      hand() {
        const P = cur();
        return { body: `<div class="lem-title"><h2>${H(P.name)}'s turn!</h2><p>Pass the ${T85 ? 'keyboard' : 'mouse'} to ${H(P.name)}. No peeking at the other stand's recipe!</p></div>`, foot: btn(`I'm ${H(P.name)}. Let's go!`, 'morning', 'Enter', true) };
      },
      dayres() {
        const rows = G.players.map(p => { const x = p.hist[p.hist.length - 1] || { sold: 0, prof: 0 }; return `<tr><td>${H(p.name)}</td><td class="n">${x.sold}</td><td class="n ${x.prof >= 0 ? 'lem-ok' : 'lem-bad'}">${money(x.prof)}</td><td class="n">${money(p.cash - 20 - (p.gift || 0))}</td></tr>`; }).join('');
        return { body: `<h2>End of day ${G.day}</h2><table class="lem-tbl"><tr><th>Stand</th><th class="n">Cups</th><th class="n">Today</th><th class="n">Season</th></tr>${rows}</table>${G.players.map(p => `<h3>${H(p.name)}</h3>${chart(p)}`).join('')}`, foot: btn(G.day >= G.len ? 'Season results' : 'Next day', 'nextday', 'Enter', true) };
      },
      end() {
        const ps = G.players.map(p => ({ p, prof: r2(p.cash - 20 - (p.gift || 0)) })).sort((a, b) => b.prof - a.prof);
        const best = ps[0];
        const two = ps.length > 1;
        const cups = p => p.hist.reduce((a, x) => a + x.sold, 0);
        const bestDay = p => p.hist.reduce((b, x) => (!b || x.prof > b.prof ? x : b), null);
        return {
          body: `<div class="lem-title"><h2>Summer is over!</h2>${two ? `<p class="lem-big">${best.prof === ps[1].prof ? "It's a tie!" : H(best.p.name) + ' wins!'}</p>` : ''}</div>
            ${ps.map(({ p, prof }) => { const bd = bestDay(p); return `<div class="lem-box sunken"><b>${H(p.name)}</b>: ${cups(p)} cups sold in ${G.len} days. Best day: day ${bd ? bd.d : '-'} (${money(bd ? bd.prof : 0)}).
              <div class="lem-eq">Season profit = cash now - starting cash${p.gift ? ' - gifts' : ''}<br><span class="lem-big">${money(p.cash)} - $20.00${p.gift ? ' - ' + money(p.gift) : ''} = <span class="${prof >= 0 ? 'lem-ok' : 'lem-bad'}">${money(prof)}</span></span></div>${chart(p)}</div>`; }).join('')}
            <p>${G.earned ? `You earned $${G.earned} of play money for your profit!` : 'Earn $1 of play money for every $10 of season profit. Try again!'}</p>`,
          foot: btn('High scores', 's_hi', 's') + btn('New season', 'setup', 'Enter', true)
        };
      }
    };

    function chart(P) {
      const hs = P.hist;
      if (!hs.length) return '<p>No days yet.</p>';
      if (T85) {
        const mx = Math.max(1, ...hs.map(x => Math.abs(x.prof))), wid = 18;
        return `<pre class="lem-pre">${hs.map(x => { const n = Math.round(Math.abs(x.prof) / mx * wid); return `Day ${String(x.d).padStart(2)} ${x.prof < 0 ? '-' : '|'}${(x.prof < 0 ? '\u2591' : '\u2588').repeat(n)}${' '.repeat(wid - n)} ${money(x.prof).padStart(7)}`; }).join('\n')}</pre>`;
      }
      const n = Math.max(hs.length, 7), w = 300, hh = 110, pad = 18;
      const mx = Math.max(5, ...hs.map(x => x.prof)), mn = Math.min(0, ...hs.map(x => x.prof));
      const y = v => pad / 2 + (mx - v) / (mx - mn) * (hh - pad);
      const bw = (w - 30) / n;
      const bars = hs.map((x, i) => { const y0 = y(0), y1 = y(x.prof); return `<rect x="${28 + i * bw + 1}" y="${Math.min(y0, y1)}" width="${Math.max(2, bw - 2)}" height="${Math.max(1, Math.abs(y1 - y0))}" fill="${x.prof >= 0 ? '#2a9a2a' : '#d03030'}"/>`; }).join('');
      const lbls = hs.map((x, i) => (n <= 14 || i % 5 === 4 || i === 0) ? `<text x="${28 + i * bw + bw / 2}" y="${hh + 2}" font-size="8" text-anchor="middle">${x.d}</text>` : '').join('');
      return `<svg class="lem-chart sunken" viewBox="0 0 ${w} ${hh + 6}" role="img" aria-label="Profit chart"><line x1="26" x2="${w}" y1="${y(0)}" y2="${y(0)}" stroke="#000"/><text x="24" y="${y(mx) + 6}" font-size="8" text-anchor="end">${money(mx).replace('.00', '')}</text><text x="24" y="${y(0) + 3}" font-size="8" text-anchor="end">$0</text>${mn < 0 ? `<text x="24" y="${y(mn)}" font-size="8" text-anchor="end">${money(mn).replace('.00', '')}</text>` : ''}${bars}${lbls}</svg>`;
    }

    /* ---------- actions ---------- */
    function startSeason() {
      const names = setup.names.slice(0, setup.n).map((n, i) => (n || '').trim().slice(0, 12) || ['Sunny', 'Pepper'][i]);
      if (names.length > 1 && names[0] === names[1]) names[1] += ' 2';
      G = { len: setup.len, day: 1, turn: 0, players: names.map(newPlayer), today: null, ph: 'morning' };
      genDay(G);
      snd(() => api.sfx.tada());
      go('morning');
    }
    function adjust(k, d) {
      const P = cur(); flash = '';
      if (scr === 'shop') {
        const s = SUP.find(x => x.k === k), pr = G.today.pr[k];
        if (d > 0) {
          if (P.cash < pr - 0.001) { flash = `Not enough cash for ${s.name.toLowerCase()}!`; snd(() => api.sfx.beep()); render(); return; }
          P.cash = r2(P.cash - pr); P.buy[k]++;
          if (k === 'lemons') { const b = P.lem.find(x => x.d === G.day); if (b) b.n += 10; else P.lem.push({ d: G.day, n: 10 }); }
          else P[k] += s.bag;
          snd(() => api.tone(880, 0.04, { vol: 0.04 }));
        } else {
          if (!P.buy[k]) return;
          P.cash = r2(P.cash + pr); P.buy[k]--;
          if (k === 'lemons') { const b = P.lem.find(x => x.d === G.day); if (b) { b.n -= 10; if (b.n <= 0) P.lem = P.lem.filter(x => x !== b); } }
          else P[k] = Math.max(0, P[k] - s.bag);
          snd(() => api.tone(440, 0.04, { vol: 0.04 }));
        }
      } else if (scr === 'recipe') {
        if (k === 'l') P.rec.l = clamp(P.rec.l + d, 1, 12);
        if (k === 's') P.rec.s = clamp(P.rec.s + d, 1, 12);
        if (k === 'i') P.rec.i = clamp(P.rec.i + d, 0, 8);
        if (k === 'p') P.price = r2(clamp(P.price + d * 0.05, 0.05, 3));
        if (k === 'g') P.signs = clamp(P.signs + d, 0, 10);
        snd(() => api.tone(d > 0 ? 700 : 520, 0.03, { vol: 0.03 }));
      }
      const keep = sel; render(); sel = keep; markSel();
    }
    function openStand() {
      const P = cur();
      const need = [];
      if (lemN(P) < P.rec.l) need.push(`${P.rec.l} lemons`);
      if (P.sugar < P.rec.s) need.push(`${P.rec.s} scoops of sugar`);
      if (P.cups < 1) need.push('some cups');
      if (P.cash < P.signs * SIGN_COST - 0.001) { P.signs = Math.floor(P.cash / SIGN_COST); }
      const run = () => {
        const res = simulate(G, P);
        G.pend = res; G.ph = 'report'; save();
        simState = { res, t0: 0, speed: opts.fast ? 3 : 1, idx: 0, shown: 0, rev: 0 };
        scr = 'sim'; render();
      };
      if (need.length) {
        api.msgBox("Sunny's Lemonade Stand", `You can't make even one pitcher! You need at least ${need.join(', ')}.\n\nGo back to the market, or stay closed today?`, ['Back to market', 'Stay closed'], 'warn').then(b => { if (b === 'Stay closed') { P.signs = 0; run(); } else if (b) go('shop'); });
        return;
      }
      run();
    }
    function buyUp(k) {
      const P = cur(), u = UPS.find(x => x.k === k);
      if (!u || P.up[k] || u.lock(G, P)) return;
      if (P.cash < u.cost) { flash = `You need ${money(u.cost)} for the ${u.name}. Keep saving!`; snd(() => api.sfx.beep()); render(); return; }
      P.cash = r2(P.cash - u.cost); P.up[k] = true; P.upSpent = r2(P.upSpent + u.cost); flash = '';
      snd(() => api.sfx.tada());
      render();
    }
    function next() {
      // after a player's report
      G.pend = null;
      if (G.turn < G.players.length - 1) { G.turn++; go('hand'); return; }
      if (G.players.length > 1) { go('dayres'); return; }
      nextDay();
    }
    function nextDay() {
      if (G.day >= G.len) { endSeason(); return; }
      G.day++; G.turn = 0;
      genDay(G);
      G.players.forEach(p => overnight(G, p));
      go(G.players.length > 1 ? 'hand' : 'morning');
    }
    function endSeason() {
      G.over = true;
      const profs = G.players.map(p => r2(p.cash - 20 - (p.gift || 0)));
      const best = Math.max(...profs);
      G.earned = Math.max(0, Math.min(6, Math.floor(best / 10)));
      G.players.forEach((p, i) => hi.push({ n: p.name, p: profs[i], len: G.len }));
      hi.sort((a, b) => b.p - a.p); hi = hi.slice(0, 10); api.save('hi', hi);
      if (G.earned > 0) api.earn(G.earned, 'your lemonade season');
      api.save('game', null);
      snd(() => api.sfx.tada());
      scr = 'end'; render();
    }

    /* ---------- the day, played out ---------- */
    function stopSim() { clearTimeout(simTimer); cancelAnimationFrame(raf); simTimer = 0; raf = 0; }
    const clockStr = t => { const m = Math.round(9 * 60 + t * 8 * 60), hh = Math.floor(m / 60), mm = m % 60; return `${hh > 12 ? hh - 12 : hh}:${String(mm - mm % 5).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`; };
    function finishSim() { stopSim(); if (scr === 'sim') { snd(() => api.sfx.ding()); go('report'); } }
    function startSim() {
      const S = simState, r = S.res;
      const clk = main.querySelector('.lem-clock'), sEl = main.querySelector('.lem-sold'), cEl = main.querySelector('.lem-cash');
      const cust = r.cust;
      let sold = 0, rev = 0;
      const tick = c => { if (c.buy) { sold++; rev += r.price; sEl.textContent = 'Sold ' + sold; cEl.textContent = money(rev); } };
      if (T85) {
        const log = main.querySelector('.lem-log');
        const lines = [];
        let hour = -1;
        cust.forEach(c => {
          const hr = Math.floor(c.t * 8);
          if (hr !== hour) { hour = hr; lines.push({ t: c.t, s: `---- ${clockStr(hr / 8)} ----` }); }
          if (c.stop) { const pl = /^Two /.test(c.who); lines.push({ t: c.t, s: `${clockStr(c.t)}  ${c.who} ${c.buy ? (pl ? 'buy cups.' : 'buys a cup.') : (pl ? 'stop by.' : 'stops by.')} "${c.say}"`, c }); }
        });
        lines.push({ t: 1, s: '---- 5:00 PM  Closing time! ----' });
        let i = 0;
        const step = () => {
          if (closed || scr !== 'sim') return;
          if (i >= lines.length) { simTimer = setTimeout(finishSim, 1200 / S.speed); return; }
          const L = lines[i++];
          log.textContent += (log.textContent ? '\n' : '') + L.s;
          log.scrollTop = log.scrollHeight;
          clk.textContent = clockStr(L.t);
          if (L.c) { tick(L.c); snd(() => L.c.buy ? api.tone(1200, 0.03, { type: 'square', vol: 0.03 }) : api.tone(300, 0.05, { type: 'square', vol: 0.03 })); }
          simTimer = setTimeout(step, Math.max(60, 9000 / lines.length) / S.speed);
        };
        step();
        return;
      }
      const wrap = main.querySelector('.lem-street'), cv = wrap.querySelector('canvas'), g = cv.getContext('2d'), said = main.querySelector('.lem-said');
      const VW = wrap.clientWidth < 440 ? 240 : 320, VH = 150, SX = VW / 2, WALK = 42;
      const DUR = 18; // seconds for a whole day at normal speed
      let k = 1;
      const fit = () => { const dpr = window.devicePixelRatio || 1, cw = Math.max(200, wrap.clientWidth); k = cw / VW; cv.width = Math.round(cw * dpr); cv.height = Math.round(VH * k * dpr); cv.style.height = VH * k + 'px'; g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0); };
      fit(); S.fit = fit;
      const T = r.w, rain = [];
      for (let i = 0; i < 40; i++) rain.push([Math.random() * VW, Math.random() * 100]);
      // Each customer walks in from an edge, reaches the stand at time c.t*DUR (if stopping), pauses, and walks on.
      cust.forEach((c, i) => { c.y = 106 + (i % 5) * 3; c.arr = c.t * DUR; c.x0 = c.dir > 0 ? -12 : VW + 12; c.start = c.arr - Math.abs(SX - c.x0) / WALK; c.pause = c.stop ? 1.3 : 0; c.done = false; });
      let clock = cust.length ? Math.min(0, cust[0].start) : 0, last = 0;
      const end = DUR + 1.5;
      const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      function person(x, y, c, t) {
        const s = c.kid ? 0.8 : 1, leg = Math.floor(t * 8) % 2;
        const hgt = 22 * s;
        R(x - 3 * s, y - hgt, 6 * s, 6 * s, c.skin);
        R(x - 3 * s, y - hgt, 6 * s, 2 * s, c.hair);
        R(x - 4 * s, y - hgt + 6 * s, 8 * s, 8 * s, c.shirt);
        R(x - 3 * s, y - hgt + 14 * s, 2 * s, (leg ? 8 : 7) * s, '#334');
        R(x + 1 * s, y - hgt + 14 * s, 2 * s, (leg ? 7 : 8) * s, '#334');
      }
      function bubble(x, y, text) {
        g.font = 'bold 7px Arial, sans-serif';
        const w = g.measureText(text).width + 8;
        const bx = clamp(x - w / 2, 2, VW - w - 2), by = y - 16;
        g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 0.6;
        g.fillRect(bx, by, w, 11); g.strokeRect(bx, by, w, 11);
        g.beginPath(); g.moveTo(x - 2, by + 11); g.lineTo(x, by + 15); g.lineTo(x + 2, by + 11); g.fill();
        g.fillStyle = '#000'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, bx + 4, by + 5.8);
      }
      function scene(time) {
        const sky = { sunny: '#78c8ff', hot: '#9ad0f0', heat: '#f0c070', cloudy: '#a8b0b8', rainy: '#6a7480' }[T];
        R(0, 0, VW, 70, sky);
        if (T === 'sunny' || T === 'hot' || T === 'heat') { g.fillStyle = T === 'heat' ? '#ff6a00' : '#ffe000'; g.beginPath(); g.arc(VW - 40, 18, T === 'sunny' ? 9 : 12, 0, 7); g.fill(); }
        if (T === 'cloudy' || T === 'rainy') { g.fillStyle = T === 'rainy' ? '#8a929c' : '#eef'; [[40, 18], [140, 12], [240, 22]].forEach(([x, y]) => { const xx = (x + time * 3) % (VW + 60) - 30; g.beginPath(); g.ellipse(xx, y, 22, 8, 0, 0, 7); g.ellipse(xx + 14, y - 4, 14, 8, 0, 0, 7); g.fill(); }); }
        // houses
        [[SX - 150, '#d08060'], [SX - 90, '#80a0d0'], [SX + 40, '#a0c080'], [SX + 102, '#e0c070']].forEach(([x, col]) => { R(x, 40, 50, 30, col); g.fillStyle = '#7a3a2a'; g.beginPath(); g.moveTo(x - 4, 40); g.lineTo(x + 25, 24); g.lineTo(x + 54, 40); g.fill(); R(x + 8, 48, 8, 8, '#fff8c0'); R(x + 34, 48, 8, 8, '#fff8c0'); R(x + 21, 56, 8, 14, '#5a3a20'); });
        R(0, 70, VW, 12, T === 'rainy' ? '#4a8a3a' : '#5aa040');
        R(0, 82, VW, 34, '#c8c0b0');
        for (let x = 0; x < VW; x += 20) R(x, 82, 1, 34, '#a8a090');
        R(0, 116, VW, 34, '#505058');
        for (let x = 0; x < VW; x += 30) R(x + 6, 132, 14, 2, '#e8e080');
        if (G.today && EV(r.ev) && r.ev === 'road') { for (let x = 30; x < VW; x += 60) { R(x, 118, 8, 10, '#ff8000'); R(x, 121, 8, 2, '#fff'); } }
      }
      function stand(time) {
        const P = G.players.find(p => p.name === r.name) || cur();
        // signs
        for (let i = 0; i < Math.min(4, r.signs); i++) { const x = SX + [-64, 48, -100, 84][i]; R(x + 7, 80, 2, 12, '#6a4a2a'); R(x, 70, 16, 11, '#fff'); R(x, 70, 16, 1, '#000'); R(x + 2, 74, 12, 1, '#e0a000'); R(x + 2, 77, 9, 1, '#e0a000'); }
        // Sunny
        const bob = Math.floor(time * 2) % 2;
        R(SX - 3, 56 - bob, 8, 7, '#f4d0a8'); R(SX - 4, 54 - bob, 10, 3, '#ffd000'); R(SX - 4, 63 - bob, 10, 8, '#ff7aa0');
        // booth
        R(SX - 26, 70, 52, 20, '#c8864a'); R(SX - 26, 70, 52, 2, '#8a5a2a'); R(SX - 22, 74, 44, 9, '#fff');
        g.font = 'bold 7px Arial, sans-serif'; g.fillStyle = '#c08000'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LEMONADE', SX, 79);
        g.textAlign = 'left';
        R(SX - 27, 44, 2, 26, '#8a5a2a'); R(SX + 25, 44, 2, 26, '#8a5a2a');
        for (let i = 0; i < 6; i++) R(SX - 30 + i * 10, 40, 10, 7, i % 2 ? '#fff' : '#ffd800');
        R(SX - 30, 47, 60, 1, '#a07800');
        R(SX + 8, 64, 7, 6, '#fff8a0'); R(SX - 16, 65, 5, 5, '#ffe000');
        if (P.up.cooler) { R(SX + 28, 78, 14, 12, '#2060d0'); R(SX + 28, 78, 14, 3, '#fff'); }
        if (r.soldOut && time > (r.cust.find(c => c.say === 'Sold out?!' || c.say === 'No cups?!') || { arr: 1e9 }).arr) { R(SX - 20, 74, 40, 9, '#d02020'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('SOLD OUT', SX, 79); g.textAlign = 'left'; }
      }
      function frame(now) {
        if (closed || scr !== 'sim') return;
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
        clock += dt * S.speed;
        scene(clock); stand(clock);
        const active = [];
        cust.forEach(c => {
          if (clock < c.start) return;
          const tIn = clock - c.start, reach = c.arr - c.start;
          let x, walking = true;
          if (tIn < reach) x = c.x0 + c.dir * tIn * WALK;
          else if (tIn < reach + c.pause) { x = SX + c.dir * -10 + (c.stop ? 0 : 0); walking = false; }
          else x = SX + c.dir * (tIn - reach - c.pause) * WALK;
          if (!c.stop && tIn >= reach) x = SX + c.dir * (tIn - reach) * WALK;
          if (x < -20 || x > VW + 20) { if (tIn > reach) { c.gone = true; } return; }
          if (c.stop && tIn >= reach && !c.done) { c.done = true; tick(c); if (c.say) { said.textContent = `${c.who}: "${c.say}"`; } snd(() => c.buy ? api.tone(1760, 0.04, { vol: 0.03 }) : api.tone(330, 0.06, { type: 'triangle', vol: 0.04 })); }
          active.push({ c, x, walking, tIn, reach });
        });
        active.sort((a, b) => a.c.y - b.c.y).forEach(a => {
          person(a.x, a.c.y, a.c, a.walking ? a.tIn : 0);
          if (a.c.buy && a.tIn >= a.reach) R(a.x + a.c.dir * 4, a.c.y - 13, 3, 4, '#fff8a0');
        });
        active.filter(a => a.c.stop && a.c.say && a.tIn >= a.reach && a.tIn < a.reach + a.c.pause + 0.6).sort((a, b) => b.c.arr - a.c.arr).slice(0, 3).forEach((a, i) => bubble(a.x + (i % 2 ? 1 : -1) * i * 14, a.c.y - 22 - i * 13, a.c.say));
        if (T === 'rainy') { g.strokeStyle = 'rgba(200,220,255,.7)'; g.lineWidth = 0.7; g.beginPath(); rain.forEach(p => { const y = (p[1] + clock * 120) % 150, x = (p[0] + clock * 20) % VW; g.moveTo(x, y); g.lineTo(x - 2, y + 6); }); g.stroke(); }
        if (T === 'heat') { g.fillStyle = 'rgba(255,140,0,.08)'; g.fillRect(0, 0, VW, VH); }
        clk.textContent = clockStr(clamp(clock / DUR, 0, 1));
        if (clock >= end) { finishSim(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    /* ---------- input ---------- */
    root.addEventListener('click', e => {
      const b = e.target.closest('button[data-a]');
      const row = e.target.closest('.lem-adj');
      if (row && !b) { sel = +row.dataset.i; markSel(); return; }
      if (!b) return;
      if (row) sel = +row.dataset.i;
      act(b.dataset.a, b);
    });
    root.addEventListener('input', e => { const i = e.target.dataset && e.target.dataset.i; if (i !== undefined && e.target.tagName === 'INPUT') setup.names[+i] = e.target.value; });
    function act(a, b) {
      if (a !== 'dec' && a !== 'inc') snd(() => api.sfx.click());
      switch (a) {
        case 'cont': return resume();
        case 'setup': return go('setup');
        case 'title': return go('title');
        case 'help': return go('help');
        case 's_hi': return go('hi');
        case 'back': return resume();
        case 'len': setup.len = +b.dataset.v; return render();
        case 'np': setup.n = +b.dataset.v; return render();
        case 'start': return startSeason();
        case 'morning': flash = ''; return go('morning');
        case 'shop': flash = ''; return go('shop');
        case 'recipe': flash = ''; return go('recipe');
        case 'ups': flash = ''; return go('ups');
        case 'buyup': return buyUp(b.dataset.k);
        case 'open': return openStand();
        case 'dec': return adjust(b.dataset.k, -1);
        case 'inc': return adjust(b.dataset.k, 1);
        case 'faster': if (simState) { simState.speed = simState.speed >= 4 ? 1 : simState.speed * 2; b.textContent = simState.speed >= 4 ? 'Normal speed' : 'Faster'; } return;
        case 'skip': return finishSim();
        case 'next': return next();
        case 'nextday': return nextDay();
      }
    }
    W.onKey = e => {
      if (e.target && e.target.tagName === 'INPUT' && e.key !== 'Enter') return;
      const rows = [...main.querySelectorAll('.lem-adj')];
      const k = e.key;
      if (rows.length && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); sel = (sel + (k === 'ArrowUp' ? -1 : 1) + rows.length) % rows.length; markSel(); rows[sel].scrollIntoView({ block: 'nearest' }); return; }
      if (rows.length && (k === 'ArrowLeft' || k === 'ArrowRight' || k === '-' || k === '+' || k === '=')) {
        e.preventDefault();
        const r = rows[sel], bb = r && r.querySelector('[data-k]');
        if (bb) adjust(bb.dataset.k, k === 'ArrowLeft' || k === '-' ? -1 : 1);
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const want = k === 'Enter' ? 'Enter' : k.length === 1 ? k.toLowerCase() : '';
      if (!want) return;
      const b = root.querySelector(`[data-key="${want}"]`);
      if (b) { e.preventDefault(); b.click(); }
    };
    W.onResize = () => { if (scr === 'sim' && simState && simState.fit) simState.fit(); };
    W.onMin = () => {};
    W.onClose = () => { closed = true; stopSim(); save(); };
    render();
  }

  /* =====================================================================
     PLUMBER PANIC
     ===================================================================== */
  const COLS = 8, ROWS = 7;
  const N = 1, E = 2, S = 4, WW = 8;
  const DXY = { 1: [0, -1], 2: [1, 0], 4: [0, 1], 8: [-1, 0] };
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const DNAME = { 1: 'up', 2: 'right', 4: 'down', 8: 'left' };
  const PC = { H: E | WW, V: N | S, NE: N | E, ES: E | S, SW: S | WW, WN: WW | N, X: 15 };
  const PNAME = { H: 'straight left-right', V: 'straight up-down', NE: 'bend up-right', ES: 'bend right-down', SW: 'bend down-left', WN: 'bend left-up', X: 'cross' };
  const PW = [['H', 3], ['V', 3], ['NE', 2], ['ES', 2], ['SW', 2], ['WN', 2], ['X', 1.3]];
  const randPiece = () => wPick(PW);
  function lvParams(n, zen) {
    return {
      goal: 6 + Math.round(n * 0.8),
      count: zen ? Infinity : Math.max(10, 25 - n) * 1000,
      tile: zen ? 2600 : Math.max(1100, 3200 - n * 105),
      rocks: n >= 4 ? Math.min(9, 1 + Math.floor((n - 4) / 2)) : 0,
      res: n >= 6 ? (n >= 13 ? 2 : 1) : 0
    };
  }
  const PP_ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#24303c" stroke="#000"/><rect x="2" y="12" width="18" height="8" fill="#c8ccd4" stroke="#000"/><rect x="12" y="12" width="8" height="18" fill="#c8ccd4" stroke="#000"/><rect x="2" y="14" width="16" height="4" fill="#a040e0"/><rect x="14" y="14" width="4" height="10" fill="#a040e0"/><circle cx="24" cy="8" r="5" fill="#e03030" stroke="#000"/><rect x="23" y="3" width="2" height="10" fill="#fff"/><rect x="19" y="7" width="10" height="2" fill="#fff"/></svg>';
  const PP_CSS = `
    .pp{height:100%;display:flex;flex-direction:column;background:#10161e;color:#e8ecf0;user-select:none;-webkit-user-select:none;font-size:13px}
    .pp-hud{display:flex;flex-wrap:wrap;gap:2px 12px;padding:3px 8px;background:#c0c0c0;color:#000;font-weight:bold;align-items:center}
    .pp-hud span b{font:18px/1 var(--dos);background:#000;color:#ffd040;padding:0 4px;margin-left:3px;display:inline-block;min-width:24px;text-align:right}
    .pp-hud .pp-lv b{color:#7fff7f}.pp-hud .pp-pipes b{color:#e0a0ff}
    .pp-wrap{flex:1;min-height:0;position:relative;overflow:hidden}
    .pp-wrap canvas{position:absolute;left:0;top:0;touch-action:none;cursor:pointer}
    .pp-bar{display:flex;gap:6px;align-items:center;padding:3px;background:#c0c0c0;color:#000}
    .pp-bar .btn{min-width:0;min-height:36px;padding:2px 12px;touch-action:manipulation}
    .pp-msg{flex:1;min-width:0;text-align:center;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .pp-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,12,20,.72);padding:10px}
    .pp-ov[hidden]{display:none}
    .pp-box{background:#c0c0c0;color:#000;padding:12px 16px;max-width:380px;width:100%;text-align:center;max-height:100%;overflow:auto}
    .pp-box h2{margin:0 0 6px;font:400 30px/1 var(--dos);color:#6010a0}
    .pp-box p{margin:6px 0;line-height:1.35;text-align:left}
    .pp-box p.c{text-align:center}
    .pp-box .pp-btns{display:flex;flex-direction:column;gap:6px;margin-top:10px}
    .pp-box .btn{min-height:40px;font-size:14px;touch-action:manipulation}
    .pp-box table{margin:6px auto;border-collapse:collapse;font-size:13px}
    .pp-box td{padding:2px 8px;text-align:left}
    .pp-box td.n{text-align:right}
    .pp-logo{font:400 44px/0.95 var(--dos);color:#ffd040;text-shadow:3px 3px 0 #6010a0;letter-spacing:2px;margin:4px 0 8px}
    .pp-2000 .pp-box{border-radius:0}
    .pp-2000 .pp-hud,.pp-2000 .pp-bar{background:linear-gradient(#e0e4ea,#b8bec8)}
  `;

  function openPlumber(W, api) {
    const Y2K = api.era.id === '2000';
    W.body.innerHTML = `<div class="pp${Y2K ? ' pp-2000' : ''}"><div class="pp-hud"><span class="pp-lv">Level<b>1</b></span><span>Score<b>0</b></span><span class="pp-pipes">Pipes<b>0/7</b></span><span class="pp-lives">Wrenches<b>3</b></span></div><div class="pp-wrap"><canvas role="img" aria-label="Plumber Panic board"></canvas><div class="pp-ov"></div></div><div class="pp-bar"><button class="btn" data-a="flow">Flow now</button><span class="pp-msg">Tap a square to lay the next pipe.</span><button class="btn" data-a="pause">Pause</button></div></div>`;
    const root = W.body.firstChild, wrap = root.querySelector('.pp-wrap'), cv = wrap.querySelector('canvas'), g = cv.getContext('2d');
    const ov = root.querySelector('.pp-ov'), msgEl = root.querySelector('.pp-msg'), flowB = root.querySelector('[data-a=flow]'), pauseB = root.querySelector('[data-a=pause]');
    const hud = [...root.querySelectorAll('.pp-hud b')];
    let opts = Object.assign({ sound: true }, api.load('opts', {}));
    let hi = api.load('hi', []);
    let run = null;   // { zen, level, score, lives, passed, earned }
    let L = null;     // level state
    let paused = false, closed = false, raf = 0, last = 0, kbd = false, cursor = { c: 3, r: 3 }, lay = null, ovOn = true, ovKeys = {};
    const snd = f => { if (opts.sound) try { f(); } catch (e) {} };
    const SND = {
      place: () => snd(() => { api.tone(520, 0.05, { type: 'square', vol: 0.04 }); api.tone(780, 0.04, { type: 'square', vol: 0.03, at: 0.04 }); }),
      wrench: () => snd(() => { api.noise(0.18, { f: 2500, q: 3, vol: 0.06 }); api.tone(220, 0.15, { type: 'sawtooth', vol: 0.03 }); }),
      bad: () => snd(() => api.tone(140, 0.15, { type: 'square', vol: 0.05 })),
      glug: () => snd(() => api.tone(rnd(180, 260), 0.09, { type: 'sine', vol: 0.07, to: rnd(320, 420) })),
      cross: () => snd(() => [0, 4, 7, 12].forEach((n, i) => api.tone(api.midi(72 + n), 0.08, { vol: 0.05, at: i * 0.06 }))),
      res: () => snd(() => api.tone(200, 0.4, { type: 'triangle', vol: 0.06, to: 500 })),
      leak: () => snd(() => { api.noise(0.8, { ft: 'lowpass', f: 900, vol: 0.1, decay: 1 }); api.tone(300, 0.6, { to: 80, type: 'sawtooth', vol: 0.04 }); }),
      open: () => snd(() => { api.noise(0.35, { f: 1500, q: 1, vol: 0.06 }); api.tone(90, 0.3, { vol: 0.06 }); }),
      tick: () => snd(() => api.tone(1000, 0.02, { type: 'square', vol: 0.02 }))
    };

    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New game (Classic)', fn: () => newRun(false) },
        { label: 'New game (Zen, no timer)', fn: () => newRun(true) },
        { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: !L || ovOn },
        { label: 'High scores', fn: showHi },
        '-', { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound effects', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
        { label: 'Reset high scores', fn: () => api.msgBox('Plumber Panic', 'Clear the high-score table?', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') { hi = []; api.save('hi', hi); } }) }
      ] },
      { label: 'Help', items: [
        { label: 'How to play', fn: showHelp },
        { label: 'About Plumber Panic', fn: () => api.msgBox('About Plumber Panic', 'Plumber Panic 1.0\nBrass Tack Games, 1995\n\nUncle Otto\'s soda plant has sprung into action, and the Grape Fizz is coming whether you are ready or not!') }
      ] }
    ]);

    /* ---------- overlay ---------- */
    function overlay(html, keys) {
      ov.innerHTML = `<div class="pp-box raised">${html}</div>`; ov.hidden = false; ovOn = true; ovKeys = keys || {};
      const f = ov.querySelector('.btn'); if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
    }
    function hideOv() { ov.hidden = true; ovOn = false; ovKeys = {}; }
    ov.addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (b) { snd(() => api.sfx.click()); ovAct(b.dataset.o); } });
    function ovAct(a) {
      if (a === 'classic') newRun(false);
      else if (a === 'zen') newRun(true);
      else if (a === 'cont') { const s = api.load('run', null); if (s) { run = s; startLevel(); } }
      else if (a === 'hi') showHi();
      else if (a === 'help') showHelp();
      else if (a === 'title') title();
      else if (a === 'go') { hideOv(); if (L) L.phase = L.zen ? 'ready' : 'count'; updHud(); }
      else if (a === 'next') { run.level++; startLevel(); }
      else if (a === 'retry') startLevel();
      else if (a === 'resume') togglePause();
    }
    const obtn = (label, a) => `<button class="btn" data-o="${a}">${label}</button>`;
    function title() {
      L = null; paused = false; flowB.textContent = 'Flow now'; pauseB.textContent = 'Pause'; msg('Tap a square to lay the next pipe.');
      const s = api.load('run', null);
      overlay(`<div class="pp-logo">PLUMBER<br>PANIC</div><p class="c">The Grape Fizz is coming! Lay pipes from the valve before it starts to flow.</p><div class="pp-btns">${s ? obtn(`Continue ${s.zen ? 'Zen' : 'Classic'} (level ${s.level})`, 'cont') : ''}${obtn('Classic game', 'classic')}${obtn('Zen mode (no timer)', 'zen')}${obtn('How to play', 'help')}${obtn('High scores', 'hi')}</div>`, { Enter: s ? 'cont' : 'classic', z: 'zen', h: 'help' });
      draw();
    }
    function showHelp() {
      const back = L ? (paused ? 'resume' : 'resume') : 'title';
      if (L && !paused && !ovOn) { paused = true; }
      overlay(`<h2>How to play</h2>
        <p>Grape Fizz will soon pour out of the red <b>valve</b>. Build a pipeline for it!</p>
        <p><b>Tap a square</b> (or move with the arrow keys and press Space) to lay the <b>next pipe</b> from the dispenser. Pipes come in a random order, so plan ahead and park awkward pieces out of the way.</p>
        <p>Tap a pipe you already laid to <b>replace</b> it with the next piece. In Classic mode that costs 25 points and your wrench needs a moment.</p>
        <p>Each level shows how many pipes the fizz must flow through. Reach the goal before the fizz spills out of an open end, and you pass!</p>
        <p><b>Bonuses:</b> 50 points per pipe (double after Flow now), 500 when the fizz crosses itself in a cross piece, 250 for filling a round tank. Longer pipelines earn a length bonus.</p>
        <p>Later levels add <b>rocks</b> (you can't build there) and <b>tanks</b> (the fizz has to go straight through them, but they take a while to fill). The flow gets faster every level.</p>
        <p>Classic: 20 levels and 3 wrenches. Every spill costs a wrench; earn one back every 5 levels. <b>Zen mode</b> has no timer: the valve waits until you press Open valve, and spills never end the game.</p>
        <p>Keys: arrows move, Space/Enter lay a pipe, F = flow now, P = pause.</p>
        <div class="pp-btns">${obtn('OK', back)}</div>`, { Enter: back, Escape: back });
    }
    function showHi() {
      if (L && !paused && !ovOn) paused = true;
      const rows = hi.length ? hi.map((x, i) => `<tr><td>${i + 1}.</td><td>${H(x.n)}</td><td class="n">${x.s}</td><td>level ${x.l}</td></tr>`).join('') : '<tr><td>No scores yet!</td></tr>';
      const back = L ? 'resume' : 'title';
      overlay(`<h2>High scores</h2><table>${rows}</table><div class="pp-btns">${obtn('OK', back)}</div>`, { Enter: back });
    }

    /* ---------- runs and levels ---------- */
    function newRun(zen) { run = { zen, level: 1, score: 0, lives: 3, passed: 0, earned: 0 }; startLevel(); }
    function startLevel() {
      paused = false;
      api.save('run', run);
      const n = run.level, P = lvParams(n, run.zen);
      const grid = Array.from({ length: COLS * ROWS }, () => ({ p: null, rock: false, res: 0, valve: 0, segs: [], used: 0 }));
      const at = (c, r) => grid[r * COLS + c];
      // valve: inside the border, pointing where there's room
      let vc, vr, vd;
      for (let tries = 0; tries < 200; tries++) {
        vc = ri(1, COLS - 2); vr = ri(1, ROWS - 2); vd = pickA([N, E, S, WW]);
        const [dx, dy] = DXY[vd]; const room = dx > 0 ? COLS - 1 - vc : dx < 0 ? vc : dy > 0 ? ROWS - 1 - vr : vr;
        if (room >= 2) break;
      }
      at(vc, vr).valve = vd;
      const near = (c, r) => Math.abs(c - vc) + Math.abs(r - vr) <= 2;
      const free = () => { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const x = at(c, r); if (!x.valve && !x.rock && !x.res && !near(c, r)) out.push([c, r]); } return out; };
      for (let i = 0; i < P.res; i++) { const f = free().filter(([c, r]) => c > 0 && r > 0 && c < COLS - 1 && r < ROWS - 1); if (f.length) { const [c, r] = pickA(f); at(c, r).res = pickA([E | WW, N | S]); } }
      for (let i = 0; i < P.rocks; i++) { const f = free(); if (f.length) { const [c, r] = pickA(f); at(c, r).rock = true; } }
      L = { n, zen: run.zen, grid, at, valve: { c: vc, r: vr, d: vd }, queue: [randPiece(), randPiece(), randPiece(), randPiece(), randPiece()], phase: 'intro', count: P.count, count0: P.count, tile: P.tile, goal: P.goal, filled: 0, cur: null, fast: false, lock: 0, leak: null, pts: [], lvScore: 0 };
      cursor = { c: vc, r: vr };
      flowB.textContent = run.zen ? 'Open valve' : 'Flow now';
      updHud(); aria();
      msg(run.zen ? 'Zen mode: take your time. Press Open valve when ready.' : 'Tap a square to lay the next pipe.');
      overlay(`<h2>Level ${n}</h2><p class="c">Build a pipeline at least <b>${P.goal} pipes</b> long.</p>${P.rocks ? `<p class="c">Watch out for ${P.rocks} rock${P.rocks > 1 ? 's' : ''}!</p>` : ''}${P.res ? `<p class="c">Fill the round tank${P.res > 1 ? 's' : ''} for a bonus.</p>` : ''}<p class="c">${run.zen ? 'No timer. Open the valve when you are ready.' : `The fizz starts flowing in ${Math.round(P.count / 1000)} seconds.`}</p><div class="pp-btns">${obtn('Start!', 'go')}</div>`, { Enter: 'go', ' ': 'go' });
      fit();
    }
    function msg(t) { msgEl.textContent = t; }
    function updHud() {
      if (!run) return;
      hud[0].textContent = run.level; hud[1].textContent = run.score;
      hud[2].textContent = L ? `${L.filled}/${L.goal}` : '0';
      hud[3].textContent = run.zen ? 'Zen' : run.lives;
    }
    function aria() {
      if (!L) return;
      const v = L.valve;
      cv.setAttribute('aria-label', `Plumber Panic board, ${COLS} columns by ${ROWS} rows. Next piece: ${PNAME[L.queue[0]]}. Valve at column ${v.c + 1}, row ${v.r + 1}, pointing ${DNAME[v.d]}.`);
      cv.dataset.next = L.queue[0]; cv.dataset.valve = `${v.c},${v.r},${v.d}`;
    }

    function place(c, r) {
      if (!L || ovOn || paused || L.phase === 'done' || L.phase === 'intro') return;
      const cell = L.at(c, r);
      if (cell.valve || cell.rock || cell.res) { SND.bad(); msg(cell.rock ? 'A rock is in the way!' : cell.res ? 'Tanks are bolted down.' : 'That is the valve.'); return; }
      if (cell.segs.length) { SND.bad(); msg('Fizz is already in that pipe!'); return; }
      if (L.lock > 0) { SND.bad(); msg('Your wrench is still busy!'); return; }
      if (cell.p) {
        if (!L.zen) { run.score = Math.max(0, run.score - 25); L.lock = 750; L.lockAt = { c, r }; }
        SND.wrench(); msg(L.zen ? 'Swapped!' : 'Replaced! (-25)');
      } else { SND.place(); }
      cell.p = L.queue.shift(); L.queue.push(randPiece());
      cell.pop = 1;
      updHud(); aria();
    }

    function startFlow() {
      if (!L || L.phase === 'flow' || L.phase === 'done') return;
      L.phase = 'flow';
      SND.open();
      const v = L.valve, cell = L.at(v.c, v.r);
      const seg = { from: 0, to: v.d, p: 0 }; cell.segs.push(seg);
      L.cur = { c: v.c, r: v.r, from: 0, to: v.d, p: 0, dur: L.tile * 0.5, seg, valve: true };
      flowB.textContent = 'Faster';
      msg('Here comes the fizz!');
    }
    function flowNow() {
      if (!L || ovOn || paused) return;
      const full = () => { L.fast = true; flowB.textContent = 'Full speed'; msg('Full speed! Double points per pipe.'); };
      if (L.phase === 'count' || L.phase === 'ready') { startFlow(); if (!L.zen) full(); return; }
      if (L.phase !== 'flow') return;
      if (L.zen) { L.fast = !L.fast; flowB.textContent = L.fast ? 'Slower' : 'Faster'; msg(L.fast ? 'Zooming!' : 'Nice and slow.'); }
      else if (!L.fast) full();
    }
    function addPts(v, x, y, label) { run.score += v; L.lvScore += v; L.pts.push({ x, y, t: 0, s: label || '+' + v }); updHud(); }
    function stepFlow(dt) {
      const C = L.cur;
      C.p += dt / (C.dur / (L.fast ? 6 : 1));
      C.seg.p = Math.min(1, C.p);
      if (C.p < 1) return;
      const cell = L.at(C.c, C.r);
      if (!C.valve) {
        L.filled++;
        addPts(L.fast && !L.zen ? 100 : 50, C.c, C.r);
        if (C.cross) { addPts(500, C.c, C.r, 'CROSS +500'); SND.cross(); }
        if (cell.res) { addPts(250, C.c, C.r, 'TANK +250'); SND.res(); }
        if (L.filled === L.goal) { msg('Goal reached! Keep it flowing for bonus points.'); snd(() => api.sfx.ding()); }
      }
      const [dx, dy] = DXY[C.to], nc = C.c + dx, nr = C.r + dy, from = OPP[C.to];
      enter(nc, nr, from);
    }
    function enter(c, r, from) {
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return leak(c, r, from);
      const cell = L.at(c, r);
      let to = 0, dur = L.tile, cross = false;
      if (cell.res) { if ((cell.res & from) && !cell.used) { to = OPP[from]; dur *= 2.5; cell.used = 3; } }
      else if (cell.p) {
        const m = PC[cell.p];
        if (m & from) {
          if (cell.p === 'X') { const ax = from & (E | WW) ? 1 : 2; if (!(cell.used & ax)) { to = OPP[from]; cross = !!cell.used; cell.used |= ax; } }
          else if (!cell.used) { to = m & ~from; cell.used = 3; }
        }
      }
      if (!to) return leak(c, r, from);
      const seg = { from, to, p: 0 }; cell.segs.push(seg);
      L.cur = { c, r, from, to, p: 0, dur, seg, cross };
      L.tile = Math.max(L.zen ? 1800 : 700, L.tile * 0.985);
      SND.glug();
    }
    function leak(c, r, from) {
      L.phase = 'done'; L.cur = null;
      L.leak = { c, r, from, t: 0 };
      SND.leak();
      msg(L.filled >= L.goal ? 'The pipeline ends here. Nice work!' : 'Spill! The fizz leaked out.');
    }
    function finish() {
      const pass = L.filled >= L.goal;
      if (pass) {
        const lb = Math.max(0, L.filled - L.goal) * 50, cb = run.level * 100;
        run.score += lb + cb; run.passed++;
        snd(() => api.sfx.tada());
        let extra = '';
        if (!run.zen && run.level % 5 === 0 && run.lives < 5) { run.lives++; extra = '<p class="c"><b>Bonus wrench!</b></p>'; }
        if (run.zen && run.passed % 3 === 0 && run.earned < 6) { run.earned++; api.earn(1, 'Plumber Panic Zen levels'); }
        updHud();
        if (run.level >= 20) { gameOver(true); return; }
        api.save('run', Object.assign({}, run, { level: run.level + 1 }));
        overlay(`<h2>Level ${run.level} clear!</h2><table><tr><td>Pipes filled</td><td class="n">${L.filled}</td></tr><tr><td>Level bonus</td><td class="n">${cb}</td></tr><tr><td>Length bonus</td><td class="n">${lb}</td></tr><tr><td><b>Score</b></td><td class="n"><b>${run.score}</b></td></tr></table>${extra}<div class="pp-btns">${obtn('Next level', 'next')}</div>`, { Enter: 'next', ' ': 'next' });
      } else {
        if (run.zen) {
          overlay(`<h2>Oops, a spill!</h2><p class="c">The fizz went through ${L.filled} of ${L.goal} pipes. No problem in Zen mode. Try again!</p><div class="pp-btns">${obtn('Try again', 'retry')}${obtn('Main menu', 'title')}</div>`, { Enter: 'retry' });
          return;
        }
        run.lives--; updHud();
        snd(() => api.sfx.crash());
        if (run.lives <= 0) { gameOver(false); return; }
        api.save('run', run);
        overlay(`<h2>Spill!</h2><p class="c">The fizz only went through ${L.filled} of ${L.goal} pipes. That cost a wrench.</p><p class="c">Wrenches left: <b>${run.lives}</b></p><div class="pp-btns">${obtn('Try again', 'retry')}</div>`, { Enter: 'retry', ' ': 'retry' });
      }
    }
    function gameOver(won) {
      api.save('run', null);
      let rank = -1;
      if (!run.zen && run.score > 0) {
        hi.push({ n: api.user || 'Plumber', s: run.score, l: run.level }); hi.sort((a, b) => b.s - a.s); hi = hi.slice(0, 8);
        rank = hi.findIndex(x => x.s === run.score && x.l === run.level); api.save('hi', hi);
      }
      let pay = 0;
      if (!run.zen) { pay = Math.min(6, Math.floor(run.passed / 3)); if (pay) api.earn(pay, 'Plumber Panic'); }
      else if (won) { pay = run.earned; }
      L.phase = 'over';
      overlay(`<h2>${won ? 'You beat all 20 levels!' : 'Game over'}</h2><p class="c">${won ? 'Uncle Otto\'s soda plant runs perfectly thanks to you!' : 'Out of wrenches. The plant is swimming in Grape Fizz!'}</p><table><tr><td>Levels passed</td><td class="n">${run.passed}</td></tr><tr><td>Final score</td><td class="n">${run.score}</td></tr></table>${rank >= 0 && rank < 8 ? `<p class="c"><b>New high score! Rank #${rank + 1}</b></p>` : ''}${pay ? `<p class="c">You earned $${pay} of play money.</p>` : (!run.zen ? '<p class="c">Pass 3 levels to earn play money.</p>' : '')}<div class="pp-btns">${obtn('Play again', run.zen ? 'zen' : 'classic')}${obtn('Main menu', 'title')}</div>`, { Enter: run.zen ? 'zen' : 'classic' });
    }
    function togglePause() {
      if (!L || L.phase === 'over') return;
      if (paused) { paused = false; hideOv(); pauseB.textContent = 'Pause'; last = 0; return; }
      if (ovOn) return;
      paused = true; pauseB.textContent = 'Resume';
      overlay(`<h2>Paused</h2><p class="c">Take a break. The fizz will wait.</p><div class="pp-btns">${obtn('Resume', 'resume')}</div>`, { Enter: 'resume', p: 'resume', ' ': 'resume' });
    }

    /* ---------- drawing ---------- */
    function fit() {
      const dpr = window.devicePixelRatio || 1, w = Math.max(200, wrap.clientWidth), h = Math.max(200, wrap.clientHeight);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pad = 6, tb = 10;
      const land = w > h * 1.05;
      let cs;
      if (land) cs = Math.floor(Math.min((w - pad * 4) / (COLS + 0.9), (h - pad * 3 - tb) / ROWS));
      else cs = Math.floor(Math.min((w - pad * 2) / COLS, (h - pad * 4 - tb) / (ROWS + 0.9)));
      cs = Math.max(20, cs);
      const qs = Math.floor(cs * 0.8), gw = cs * COLS, gh = cs * ROWS;
      let gx, gy, qx, qy, qdir;
      if (land) { const tw = qs + pad * 2 + gw; gx = Math.floor((w - tw) / 2); gy = Math.floor((h - gh - tb - pad) / 2) + tb + pad; qx = gx + gw + pad * 2; qy = gy; qdir = 'v'; }
      else { const th = qs + pad * 2 + tb + gh; gx = Math.floor((w - gw) / 2); qy = Math.max(pad, Math.floor((h - th) / 2)); qx = gx; gy = qy + qs + pad * 2 + tb; qdir = 'h'; }
      lay = { w, h, cs, qs, gx, gy, qx, qy, qdir, tb, pad };
      cv.dataset.geom = `${gx},${gy},${cs}`;
      draw();
    }
    const CO = Y2K
      ? { bg: '#0e1622', tile: '#2a3a4c', tile2: '#324458', pipe: '#dfe4ea', pipe2: '#98a2ae', edge: '#1a2028', fizz: '#a03ce8', fizz2: '#d890ff', rock: '#7a6e62' }
      : { bg: '#10161e', tile: '#34485c', tile2: '#3c5268', pipe: '#c8ccd4', pipe2: '#8a929c', edge: '#101418', fizz: '#9020d0', fizz2: '#c070ff', rock: '#807060' };
    function band(x, y, s, side, len, wid, col) {
      // a rectangle running from the center of the cell toward `side`, `len` long (in cell fractions of the half)
      const cx = x + s / 2, cy = y + s / 2, L2 = s / 2 * len, hw = wid / 2;
      g.fillStyle = col;
      if (side === N) g.fillRect(cx - hw, cy - L2, wid, L2);
      else if (side === S) g.fillRect(cx - hw, cy, wid, L2);
      else if (side === E) g.fillRect(cx, cy - hw, L2, wid);
      else g.fillRect(cx - L2, cy - hw, L2, wid);
    }
    function edgeBand(x, y, s, side, len, wid, col) {
      // from the edge of the cell toward the center
      const cx = x + s / 2, cy = y + s / 2, L2 = s / 2 * len, hw = wid / 2;
      g.fillStyle = col;
      if (side === N) g.fillRect(cx - hw, y, wid, L2);
      else if (side === S) g.fillRect(cx - hw, y + s - L2, wid, L2);
      else if (side === E) g.fillRect(x + s - L2, cy - hw, L2, wid);
      else g.fillRect(x, cy - hw, L2, wid);
    }
    function drawPipe(x, y, s, type) {
      const m = PC[type], bw = Math.round(s * 0.36), ow = bw + Math.max(2, Math.round(s * 0.08));
      const sides = [N, E, S, WW].filter(d => m & d);
      sides.forEach(d => band(x, y, s, d, 1, ow, CO.edge));
      if (type !== 'X' && type !== 'H' && type !== 'V') g.fillStyle = CO.edge, g.fillRect(x + s / 2 - ow / 2, y + s / 2 - ow / 2, ow, ow);
      sides.forEach(d => band(x, y, s, d, 1, bw, CO.pipe));
      if (type !== 'X' && type !== 'H' && type !== 'V') g.fillStyle = CO.pipe, g.fillRect(x + s / 2 - bw / 2, y + s / 2 - bw / 2, bw, bw);
      // flanges at the edges
      const fl = Math.max(2, Math.round(s * 0.07));
      sides.forEach(d => { edgeBand(x, y, s, d, fl / (s / 2), ow + 2, CO.edge); edgeBand(x, y, s, d, (fl - 1) / (s / 2), ow, CO.pipe2); });
      if (type === 'X') { // bridge ring in the middle
        g.fillStyle = CO.edge; g.fillRect(x + s / 2 - ow / 2 - 1, y + s / 2 - bw / 2, ow + 2, bw);
        g.fillStyle = CO.pipe2; g.fillRect(x + s / 2 - bw / 2, y + s / 2 - bw / 2 + 1, bw, bw - 2);
      }
      if (Y2K) { g.fillStyle = 'rgba(255,255,255,.35)'; sides.forEach(d => { if (d === E || d === WW) band(x, y - bw * 0.25, s, d, 1, bw * 0.2, 'rgba(255,255,255,.35)'); else band(x - bw * 0.25, y, s, d, 1, bw * 0.2, 'rgba(255,255,255,.35)'); }); }
    }
    function drawFizz(x, y, s, seg) {
      const lw = Math.round(s * 0.36 * 0.6), p = seg.p;
      if (!seg.from) { band(x, y, s, seg.to, p, lw, CO.fizz); return; }
      edgeBand(x, y, s, seg.from, Math.min(1, p * 2), lw, CO.fizz);
      if (p > 0.5) { g.fillStyle = CO.fizz; g.fillRect(x + s / 2 - lw / 2, y + s / 2 - lw / 2, lw, lw); band(x, y, s, seg.to, (p - 0.5) * 2, lw, CO.fizz); }
      // bubbles
      g.fillStyle = CO.fizz2;
      const t = performance.now() / 300;
      for (let i = 0; i < 2; i++) { const k = ((t + i * 0.5 + x * 0.01) % 1) * Math.min(1, p); const d = k < 0.5 ? seg.from : seg.to; const f = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2; const cx = x + s / 2 + (DXY[d][0] * f * s / 2) * 0.9, cy = y + s / 2 + (DXY[d][1] * f * s / 2) * 0.9; g.fillRect(cx - 1, cy - 1, 2, 2); }
    }
    function drawTank(x, y, s, cell) {
      const m = cell.res, bw = Math.round(s * 0.36), ow = bw + Math.max(2, Math.round(s * 0.08));
      [N, E, S, WW].filter(d => m & d).forEach(d => { band(x, y, s, d, 1, ow, CO.edge); band(x, y, s, d, 1, bw, CO.pipe); });
      const r = s * 0.36;
      g.fillStyle = CO.edge; g.beginPath(); g.arc(x + s / 2, y + s / 2, r + 2, 0, 7); g.fill();
      g.fillStyle = '#5a7890'; g.beginPath(); g.arc(x + s / 2, y + s / 2, r, 0, 7); g.fill();
      const seg = cell.segs[0];
      if (seg) { const lvl = seg.p; g.save(); g.beginPath(); g.arc(x + s / 2, y + s / 2, r - 1, 0, 7); g.clip(); g.fillStyle = CO.fizz; g.fillRect(x, y + s / 2 + r - 2 * r * lvl, s, 2 * r * lvl + 2); g.restore(); }
      g.strokeStyle = '#c8e0f0'; g.lineWidth = 1; g.beginPath(); g.arc(x + s / 2, y + s / 2, r - 3, 3.6, 4.6); g.stroke();
    }
    function drawValve(x, y, s, d) {
      const bw = Math.round(s * 0.36), ow = bw + Math.max(2, Math.round(s * 0.08));
      band(x, y, s, d, 1, ow, CO.edge); band(x, y, s, d, 1, bw, CO.pipe);
      const cell = L.at(L.valve.c, L.valve.r);
      cell.segs.forEach(sg => drawFizz(x, y, s, sg));
      const r = s * 0.3, cx = x + s / 2, cy = y + s / 2;
      g.fillStyle = CO.edge; g.beginPath(); g.arc(cx, cy, r + 2, 0, 7); g.fill();
      g.fillStyle = '#d02828'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      const ang = L.phase === 'flow' || L.phase === 'done' ? performance.now() / 200 : 0;
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, s * 0.06);
      g.beginPath(); for (let i = 0; i < 2; i++) { const a = ang + i * Math.PI / 2; g.moveTo(cx - Math.cos(a) * r * 0.8, cy - Math.sin(a) * r * 0.8); g.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); } g.stroke();
      g.fillStyle = '#ffd040'; g.beginPath(); g.arc(cx, cy, r * 0.25, 0, 7); g.fill();
      if (L.phase === 'count') {
        g.font = `bold ${Math.round(s * 0.26)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const t = String(Math.ceil(L.count / 1000));
        g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, r * 0.55, 0, 7); g.fill(); g.fillStyle = '#ffd040'; g.fillText(t, cx, cy + 1);
      }
    }
    function drawRock(x, y, s) {
      const cx = x + s / 2, cy = y + s / 2, r = s * 0.38;
      g.fillStyle = '#2a2420'; g.beginPath();
      [[-1, 0.2], [-0.7, -0.6], [0, -0.9], [0.7, -0.6], [1, 0.1], [0.7, 0.7], [-0.2, 0.85], [-0.8, 0.6]].forEach(([a, b], i) => { const px = cx + a * r, py = cy + b * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill();
      g.fillStyle = CO.rock; g.beginPath();
      [[-0.9, 0.2], [-0.6, -0.5], [0, -0.8], [0.6, -0.5], [0.9, 0.1], [0.6, 0.6], [-0.2, 0.75], [-0.7, 0.5]].forEach(([a, b], i) => { const px = cx + a * r, py = cy + b * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill();
      g.fillStyle = '#a89a8a'; g.fillRect(cx - r * 0.4, cy - r * 0.5, r * 0.4, r * 0.2);
    }
    function draw() {
      if (!lay) return;
      const { w, h, cs, qs, gx, gy, qx, qy, qdir, tb, pad } = lay;
      g.fillStyle = CO.bg; g.fillRect(0, 0, w, h);
      if (!L) {
        // title backdrop: a few decorative pipes
        const s = Math.max(24, Math.min(64, Math.floor(w / 8)));
        const deco = ['ES', 'H', 'H', 'SW', 'V', 'NE', 'X', 'WN'];
        for (let i = 0; i < 12; i++) { const c = i % 6, r = Math.floor(i / 6); g.globalAlpha = 0.35; drawPipe(c * s * 1.4 + 10, r * s * 3 + 20, s, deco[i % deco.length]); g.globalAlpha = 1; }
        return;
      }
      // dispenser
      const qn = 5;
      g.fillStyle = '#000';
      if (qdir === 'v') g.fillRect(qx - 3, qy - 3, qs + 6, qn * (qs + 4) + 4); else g.fillRect(qx - 3, qy - 3, qn * (qs + 4) + 4, qs + 6);
      for (let i = 0; i < qn; i++) {
        const x = qdir === 'v' ? qx : qx + i * (qs + 4), y = qdir === 'v' ? qy + i * (qs + 4) : qy;
        g.fillStyle = i === 0 ? '#5a4a10' : CO.tile; g.fillRect(x, y, qs, qs);
        drawPipe(x, y, qs, L.queue[i]);
        if (i === 0) { g.strokeStyle = '#ffd040'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, qs - 2, qs - 2); }
      }
      // countdown bar
      const bx = gx, by = gy - tb - 3, bwid = cs * COLS;
      g.fillStyle = '#000'; g.fillRect(bx, by, bwid, tb);
      if (L.zen) { g.fillStyle = '#3a8a3a'; g.fillRect(bx + 1, by + 1, bwid - 2, tb - 2); }
      else {
        const f = L.phase === 'count' || L.phase === 'intro' ? L.count / L.count0 : 0;
        g.fillStyle = f < 0.25 ? '#e03030' : '#e0b020'; g.fillRect(bx + 1, by + 1, (bwid - 2) * f, tb - 2);
      }
      // grid
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const x = gx + c * cs, y = gy + r * cs, cell = L.at(c, r);
        g.fillStyle = (c + r) % 2 ? CO.tile : CO.tile2; g.fillRect(x, y, cs, cs);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + cs - 1, cs, 1); g.fillRect(x + cs - 1, y, 1, cs);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y, cs, 1); g.fillRect(x, y, 1, cs);
        if (cell.rock) drawRock(x, y, cs);
        else if (cell.res) drawTank(x, y, cs, cell);
        else if (cell.valve) drawValve(x, y, cs, cell.valve);
        else if (cell.p) {
          let sc = 1;
          if (cell.pop) { sc = 1 + cell.pop * 0.15; }
          if (sc !== 1) { g.save(); g.translate(x + cs / 2, y + cs / 2); g.scale(sc, sc); g.translate(-(x + cs / 2), -(y + cs / 2)); }
          drawPipe(x, y, cs, cell.p);
          cell.segs.forEach(sg => drawFizz(x, y, cs, sg));
          if (sc !== 1) g.restore();
        }
      }
      // leak splash
      if (L.leak) {
        const lk = L.leak, fd = DXY[lk.from];
        const ex = gx + (lk.c + 0.5) * cs + fd[0] * cs / 2, ey = gy + (lk.r + 0.5) * cs + fd[1] * cs / 2;
        g.fillStyle = CO.fizz;
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + lk.t * 2, rr = cs * (0.15 + lk.t * 0.35) * (0.6 + (i % 3) * 0.2); g.beginPath(); g.arc(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr, cs * 0.07, 0, 7); g.fill(); }
        g.beginPath(); g.arc(ex, ey, cs * 0.12 * (1 + lk.t), 0, 7); g.fill();
      }
      // wrench busy
      if (L.lock > 0 && L.lockAt) { const x = gx + L.lockAt.c * cs, y = gy + L.lockAt.r * cs; g.fillStyle = 'rgba(255,208,64,.35)'; g.fillRect(x, y, cs, cs); g.fillStyle = '#000'; g.fillRect(x + 3, y + cs - 8, cs - 6, 5); g.fillStyle = '#ffd040'; g.fillRect(x + 4, y + cs - 7, (cs - 8) * (1 - L.lock / 750), 3); }
      // floating points
      g.font = `bold ${Math.max(11, Math.round(cs * 0.26))}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      L.pts.forEach(p => { const x = gx + (p.c !== undefined ? p.c : p.x) * cs + cs / 2, y = gy + (p.r !== undefined ? p.r : p.y) * cs + cs / 2 - p.t * cs * 0.8; g.globalAlpha = Math.max(0, 1 - p.t); g.fillStyle = '#000'; g.fillText(p.s, x + 1, y + 1); g.fillStyle = p.s.length > 4 ? '#ffd040' : '#fff'; g.fillText(p.s, x, y); g.globalAlpha = 1; });
      if (kbd && !ovOn) { g.strokeStyle = '#ffd040'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(gx + cursor.c * cs + 2, gy + cursor.r * cs + 2, cs - 4, cs - 4); g.setLineDash([]); }
    }

    /* ---------- loop ---------- */
    function frame(now) {
      if (closed) return;
      const dt = last ? Math.min(100, now - last) : 0; last = now;
      if (L && !paused && !ovOn) {
        if (L.lock > 0) L.lock = Math.max(0, L.lock - dt);
        if (L.phase === 'count') { const before = Math.ceil(L.count / 1000); L.count -= dt; const after = Math.ceil(L.count / 1000); if (after !== before && after <= 3 && after > 0) SND.tick(); if (L.count <= 0) { L.count = 0; startFlow(); } }
        else if (L.phase === 'flow' && L.cur) stepFlow(dt);
        else if (L.phase === 'done' && L.leak) { L.leak.t += dt / 1000; if (L.leak.t > 1.3) { L.leak.t = 1.3; L.phase = 'post'; finish(); } }
        L.grid.forEach(c => { if (c.pop) c.pop = Math.max(0, c.pop - dt / 150); });
        L.pts.forEach(p => { p.t += dt / 1000; }); L.pts = L.pts.filter(p => p.t < 1);
        updPipes();
      }
      draw();
      raf = requestAnimationFrame(frame);
    }
    let lastPipes = '';
    function updPipes() { const s = `${L.filled}/${L.goal}`; if (s !== lastPipes) { lastPipes = s; hud[2].textContent = s; } }

    /* ---------- input ---------- */
    cv.addEventListener('pointerdown', e => {
      if (!lay || !L) return;
      e.preventDefault();
      const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
      const c = Math.floor((x - lay.gx) / lay.cs), r = Math.floor((y - lay.gy) / lay.cs);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      kbd = e.pointerType === 'keyboard';
      cursor = { c, r };
      place(c, r);
    });
    root.querySelector('.pp-bar').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'flow') flowNow();
      if (b.dataset.a === 'pause') togglePause();
    });
    W.onKey = e => {
      const k = e.key;
      if (ovOn) {
        const a = ovKeys[k] || ovKeys[k.toLowerCase()];
        if (a) { e.preventDefault(); ovAct(a); }
        return;
      }
      if (!L) return;
      if (k.startsWith('Arrow')) {
        e.preventDefault(); kbd = true;
        if (k === 'ArrowUp') cursor.r = (cursor.r + ROWS - 1) % ROWS;
        if (k === 'ArrowDown') cursor.r = (cursor.r + 1) % ROWS;
        if (k === 'ArrowLeft') cursor.c = (cursor.c + COLS - 1) % COLS;
        if (k === 'ArrowRight') cursor.c = (cursor.c + 1) % COLS;
        return;
      }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); kbd = true; place(cursor.c, cursor.r); return; }
      if (k === 'f' || k === 'F') { e.preventDefault(); flowNow(); return; }
      if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); }
    };
    W.onMin = () => { if (L && !paused && !ovOn && L.phase !== 'over') togglePause(); };
    W.onResize = () => fit();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => fit()); ro.observe(wrap); }
    W.onClose = () => { closed = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (run && L && L.phase !== 'over') api.save('run', Object.assign({}, run)); };
    fit();
    title();
    raf = requestAnimationFrame(frame);
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'lemonade',
    label: "Sunny's Lemonade Stand",
    cmd: 'LEMONADE',
    kind: 'builtin', cat: 'game',
    eras: ['1985', '1990', '1995', '2000'],
    icon: LEM_ICON,
    window: { w: 600, h: 520 },
    css: LEM_CSS,
    open: openLemonade
  }, {
    id: 'plumber',
    label: 'Plumber Panic',
    kind: 'store', cat: 'game', year: 1995, price: 14.95, sizeKB: 1600,
    publisher: 'Brass Tack Games',
    genre: 'Puzzle',
    tagline: 'The fizz is coming. Is your pipeline ready?',
    blurb: 'Uncle Otto\'s soda plant is about to open the valve, and the Grape Fizz is coming whether you are ready or not! Lay straight pipes, bends and crosses from a random dispenser to build the longest pipeline you can before the purple flood starts. Score big for crossovers and long runs, dodge rocks, fill round tanks and survive 20 ever-faster levels. Includes a relaxing Zen mode with no timer for younger plumbers.',
    box: { bg: '#1c2840', fg: '#ffd040', accent: '#a040e0' },
    icon: PP_ICON,
    window: { w: 560, h: 520 },
    css: PP_CSS,
    open: openPlumber
  });
})();
