/* More of the 2000 Web: weblogs, a dot-com intranet, Grandma Jo's first home page, e-cards,
   fantasy football, game reviews, an auction, a leftover Y2K page, an MP3 FAQ, a quiz and horoscopes.
   Each page registers on window.RETRO_SITES (see js/web/README.md). */
(function () {
  'use strict';
  const SITES = (window.RETRO_SITES = window.RETRO_SITES || []);
  const Y = ['2000'];
  const CB = 'http://www.cyberburbs.com/';
  const U = {
    home: 'http://www.prairienet.com/', finder: 'http://www.webfinder.com/', news: 'http://www.dailybyte.com/', depot: 'http://www.downloaddepot.com/',
    pets: 'http://www.pixelpets.com/', blog: 'http://www.pixelpets.com/kevin/weblog.html', bid: 'http://www.bidbarn.com/', cyber: CB,
    blogs: 'http://www.weblogworld.com/', dana: 'http://www.dearweblog.com/danabanana/', intranet: 'http://intranet.pixelpets.com/',
    grandma: CB + 'heartland/4455/', oldkev: CB + 'siliconhills/4077/', ecard: 'http://www.ecardcorner.com/', fantasy: 'http://www.fantasyleaguecentral.com/',
    games: 'http://www.pixelpulse.com/', item: 'http://www.bidbarn.com/item/40211.html', y2k: 'http://www.y2kready-now.com/',
    mp3: 'http://www.prairienet.com/help/mp3faq.html', quiz: 'http://www.quizmania2000.com/', stars: 'http://www.prairienet.com/horoscopes/'
  };
  function reg(url, page, search) { SITES.push({ eras: Y, url, page: (u, h) => page(h, u), search: (search || []).map(e => Object.assign({ url }, e)) }); }
  const A = (h, u, t) => h.A(u, t);
  const style = css => `<style>${css}</style>`;
  const top = (title, sub, bg) => `<div class="top"${bg ? ` style="background:${bg}"` : ''}>${title} <small>${sub}</small></div>`;
  const foot = h => `<p class="pd">${A(h, U.home, 'PrairieNet')} · ${A(h, U.finder, 'WebFinder')} · ${A(h, U.news, 'The Daily Byte')}</p>`;
  const stopBtn = label => `<p style="text-align:center"><button class="btn" data-stopmusic>${label}</button></p>`;
  const bindStop = (root, h) => { const b = root.querySelector('[data-stopmusic]'); if (b) b.onclick = () => { h.stopMusic('web'); b.disabled = true; b.textContent = 'Music stopped'; }; };

  /* ---------- weblog directory ---------- */
  reg(U.blogs, h => ({ title: 'WeblogWorld: The Weblog Directory', cls: 'w00', blocks: [
    top('WeblogWorld', 'Tracking 2,140 weblogs. Last year there were 23.', 'linear-gradient(#6a4,#361)'),
    `<div class="pd"><p>A <b>weblog</b> (people are starting to say "blog") is a web page where someone writes short posts, newest on top. Some are diaries. Some are lists of cool links. One is written by a cat.</p></div>`,
    `<div class="cols">
      <div class="box"><h3>MOST POPULAR</h3><div>${A(h, U.blog, "Kevin's Weblog")}<br><small>A dot-com CEO writes about foosball and Y2K.</small><br><br>${A(h, U.dana, 'danabanana: dear weblog')}<br><small>Life in Chicago, mix CDs, and the library computers.</small><br><br>${A(h, U.grandma, "Grandma Jo's Corner")}<br><small>ALL CAPS. ALL HEART.</small></div></div>
      <div class="box"><h3>NEW TODAY</h3><div>Frag Log (DoomDude)<br><small>Offline: "brb, my mom needs the phone"</small><br><br>Whiskers Writes<br><small>A weblog written by a cat. Every post is "asdfjkl;".</small><br><br>${A(h, U.y2k, 'Y2K Survival HQ')}<br><small>Not updated since December 30, 1999.</small></div></div>
      <div class="box"><h3>START YOUR OWN</h3><div>All you need is a home page and something to say. Or just a home page. ${h.APP('pagebuilder', 'Build one with Home Page Builder')}</div></div>
    </div>`,
    foot(h)
  ]}), [{ title: 'WeblogWorld: The Weblog Directory', desc: 'Find weblogs (blogs): Kevin, Dana, Grandma Jo, and a cat.', keywords: 'weblog weblogs blog blogs directory diary journal online', cat: 'web' }]);

  /* ---------- Dana's online diary ---------- */
  reg(U.dana, h => ({ title: 'danabanana: dear weblog', cls: 'w00', blocks: [
    style('.wxdana{background:#fff6fb}.wxdana h2{color:#c06}.wxdana .pd{border-left:4px solid #f9c;margin:8px 14px;padding:2px 10px}'),
    `<div class="wxdana">${top('dear weblog', 'the online diary of danabanana, age 22, Chicago', 'linear-gradient(#f69,#c36)')}</div>`,
    `<div class="wxdana"><div class="pd"><h2>Mar 3, 2000</h2><p>my sister was on the phone ALL NIGHT so i'm typing this at the library. there is a 30 minute limit. a man behind me is breathing very impatiently.</p></div><div class="pd"><h2>Feb 20, 2000</h2><p>burned a mix CD. 18 songs. i named it "Songs for Waiting for Pages to Load."</p></div><div class="pd"><h2>Feb 2, 2000</h2><p>found my old fan page for The Unexplained Files. from 1995. the theme music still plays. i can't make it stop. i don't want to.</p></div><div class="pd"><h2>Jan 1, 2000</h2><p>Y2K update: nothing happened. Kevin IMed me at 12:01 to say "still here lol." we are all still here lol.</p></div></div>`,
    `<p class="pd">${A(h, U.blogs, 'WeblogWorld')} · ${A(h, U.blog, "Kevin's weblog")} · ${h.APP('im', 'IM me')}</p>`
  ]}), [{ title: 'danabanana: dear weblog', desc: "Dana's online diary from Chicago: mix CDs, library computers, Y2K.", keywords: 'dana diary weblog blog chicago journal mix cd', cat: 'web' }]);

  /* ---------- Kevin's company intranet ---------- */
  reg(U.intranet, h => ({ title: 'PixelPets Intranet (EMPLOYEES ONLY)', cls: 'w00', blocks: [
    `${top('PixelPets Intranet', 'EMPLOYEES ONLY. If you are not an employee, please pretend you are.', 'linear-gradient(#f39,#b06)')}`,
    `<div class="pd" data-gate><p><b>Scan your employee badge to continue.</b></p><p><label>Badge number: <input type="text" maxlength="8" size="10" data-badge aria-label="Badge number"></label> <button class="btn" data-enter>Enter</button></p><p style="color:#888;font-size:11px">The badge reader is broken. Any number works. So does no number.</p></div>`,
    `<div data-inside hidden><div class="cols">
      <div class="box"><h3>MEMO FROM KEVIN (CEO)</h3><div>Team! The office PixelPet (Biscuit Jr.) is <b>virtual</b>. Please stop leaving real kibble on the server. It is getting into the fans.</div></div>
      <div class="box"><h3>MONEY THERMOMETER</h3><div>Money left: <b>$3.1 million</b><br>Spent this month: $2.4 million<br>Months left: "plenty" (Kevin)<br>Months left: 1.3 (Accounting)</div></div>
      <div class="box"><h3>CUSTOMERS THIS WEEK</h3><div><b>14</b> (up 40%!)<br>Grandma Jo is 3 of them.</div></div>
      <div class="box"><h3>CAFETERIA</h3><div>Mon-Fri: Free pizza<br>Friday: Free pizza, but fancy<br><small>(Paid for by our investors, who don't know yet)</small></div></div>
      <div class="box"><h3>FOOSBALL TOURNAMENT</h3><div>Semifinal: Marketing vs. Engineering<br>Final: Winner vs. the Foosball Table (undefeated)</div></div>
      <div class="box"><h3>EMPLOYEE OF THE MONTH</h3><div>The foosball table. Again.</div></div>
    </div><p class="pd">Links: ${A(h, U.pets, 'PixelPets.com')} · ${A(h, U.blog, "Kevin's Weblog")} · ${A(h, U.item, 'Office supplies (BidBarn)')}</p></div>`
  ], after(root) {
    const go = () => { root.querySelector('[data-gate]').hidden = true; root.querySelector('[data-inside]').hidden = false; };
    root.querySelector('[data-enter]').onclick = go;
    root.querySelector('[data-badge]').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  } }), [{ title: 'PixelPets Intranet', desc: "Kevin's company intranet. Employees only. (The badge reader is broken.)", keywords: 'pixelpets intranet company office employees kevin dot-com startup foosball memo', cat: 'biz' }]);

  /* ---------- Grandma Jo's first home page ---------- */
  const POLKA = { mel: [72, 76, 79, 76, 72, 76, 79, 76, 74, 77, 81, 77, 74, 77, 79, 77], bass: [48, 43, 50, 43], step: 0.16, lead: 'triangle', leadVol: 0.07, drums: 'four' };
  const BISCUIT = `<svg class="img" data-kb="30" width="160" height="96" viewBox="0 0 40 24" style="max-width:100%"><rect width="40" height="24" fill="#ffe6f2"/><circle cx="20" cy="14" r="7" fill="#f9c"/><circle cx="15" cy="7" r="3" fill="#f9c"/><circle cx="25" cy="7" r="3" fill="#f9c"/><circle cx="17" cy="13" r="1.2"/><circle cx="23" cy="13" r="1.2"/><path d="M17 16q3 2.5 6 0" fill="none" stroke="#000" stroke-width=".8"/></svg>`;
  const JO_GB = [{ n: 'KevRocks22', w: 'PixelPets HQ', m: 'Grandma you did it!!! You made a home page! (You can turn off caps lock by pressing the Caps Lock key)' }, { n: 'DanaBanana', w: 'Chicago', m: 'Hi Grandma Jo!!! Love the music!' }];
  reg(U.grandma, h => {
    const list = h.store.get('joGuestbook', JO_GB);
    return { title: "GRANDMA JO'S HOME PAGE", cls: 'w00', music: POLKA, blocks: [
      style('.wxjo{background:#fdf0f6;font:15px/1.5 "Comic Sans MS","Comic Neue",cursive;padding:4px 14px}.wxjo h1{color:#c06;text-align:center;font-size:30px;text-shadow:2px 2px 0 #fc9}.wxjo h2{color:#906;font:700 18px "Comic Sans MS",cursive}'),
      `<div class="wxjo"><h1>WELCOME TO GRANDMA JO'S HOME PAGE</h1><p style="text-align:center"><b>(THIS IS GRANDMA)</b></p><p style="text-align:center">HELLO AND WELCOME. MY GRANDSON KEVIN SET THIS UP FOR ME. HE IS A C.E.O. NOW. I DO NOT KNOW WHAT THAT IS BUT HE HAS A FOOSBALL TABLE.</p></div>`,
      `<div class="wxjo"><h2>MY PIXELPET BISCUIT</h2><p>${BISCUIT}</p><p>THIS IS BISCUIT. HE LIVES ON THE COMPUTER. I FEED HIM EVERY MORNING WITH MY COFFEE. HE HAS NEVER ONCE LEFT CRUMBS.</p></div>`,
      `<div class="wxjo"><h2>MY FAVORITE WEB SITES</h2><ul><li>${A(h, U.pets, 'PIXELPETS.COM')} (MY GRANDSON'S)</li><li>${A(h, U.ecard, 'E-CARD CORNER')} (I SEND ONE EVERY DAY)</li><li>${A(h, U.fantasy, 'MY FOOTBALL LEAGUE')} (I AM WINNING)</li><li>${A(h, U.stars, 'HOROSCOPES')}</li></ul></div>`,
      `<div class="wxjo"><h2>FAMOUS SNICKERDOODLES</h2><p>BUTTER, SUGAR, AN EGG, FLOUR, CREAM OF TARTAR AND BAKING SODA. ROLL IN CINNAMON SUGAR. BAKE UNTIL THEY SMELL DONE. KEVIN TYPED THE REAL RECIPE ONTO THE INTERNET IN 1990 SO IT IS IN THERE SOMEWHERE.</p></div>`,
      `<div class="wxjo"><h2>PLEASE SIGN MY GUESTBOOK</h2>${h.gb.html(list)}${h.gb.form()}</div>`,
      `<div class="wxjo"><p style="text-align:center">THIS PAGE IS BEST VIEWED WITH YOUR GLASSES ON.<br>${A(h, U.cyber, 'CYBERBURBS HEARTLAND')}</p>${stopBtn('TURN OFF THE POLKA')}</div>`
    ], after(root, nv) {
      bindStop(root, h);
      const f = root.querySelector('[data-sign]');
      f.onsubmit = e => { e.preventDefault(); const l = h.store.get('joGuestbook', JO_GB); l.push({ n: f.n.value.trim().slice(0, 30), w: f.w.value.trim().slice(0, 30) || 'The Internet', m: f.m.value.trim().slice(0, 200) }); h.store.set('joGuestbook', l.slice(-40)); nv.nav(U.grandma, 'reload'); };
    }};
  }, [{ title: "Grandma Jo's Home Page", desc: 'Grandma Jo made a home page! Her PixelPet Biscuit, favorite sites, and a guestbook.', keywords: 'grandma jo home page personal biscuit pixelpet polka snickerdoodles guestbook', cat: 'web' }]);

  /* ---------- Kevin's old 1995 page, abandoned ---------- */
  reg(U.oldkev, h => ({ title: "Kevin's Kool Kyber Korner", cls: 'kev95', blocks: [
    `<p style="background:#ff0;color:#000;padding:4px;font:12px Arial">CyberBurbs notice: this page has not been updated since March 1996.</p>`,
    `<h1>&gt;&gt;&gt; Kevin's Kool Kyber Korner &lt;&lt;&lt;</h1><div class="frame"><p class="center">Hey, it's Kevin! I'm 17 now.</p><p class="center"><i>(He is 22 now.)</i></p></div>`,
    `<div class="frame"><h2 style="color:#ff0">Band News</h2><p>The Dial Tones broke up. Creative differences. (We disagreed about whether to practice.)</p></div>`,
    `<div class="frame"><h2 style="color:#ff0">Kool Links</h2><ul><li>The FishCam!!! <small>(link broken)</small></li><li>Dana's Unexplained Files page <small>(link broken)</small></li><li>${A(h, U.pets, 'My new thing: PixelPets.com')} <small>(added in 1999, the only link that works)</small></li></ul></div>`,
    `<p class="center">${h.CONSTRUCTION}</p><p class="center"><small>Under construction since 1995.</small></p><p class="center">${A(h, U.cyber, 'CyberBurbs')}</p>`
  ]}), [{ title: "Kevin's Kool Kyber Korner (1995)", desc: "Kevin's old home page, abandoned since 1996. Still under construction.", keywords: 'kevin old home page 1995 abandoned kyber korner dial tones', cat: 'web' }]);

  /* ---------- e-cards ---------- */
  const CARDS = [
    ['bday', 'Happy Birthday!', '#fde', '<circle cx="20" cy="16" r="6" fill="#f44"/><circle cx="32" cy="12" r="6" fill="#48f"/><circle cx="44" cy="17" r="6" fill="#fc0"/><path d="M20 22v14M32 18v18M44 23v13" stroke="#666" stroke-width=".6"/><rect x="18" y="38" width="28" height="12" fill="#fff" stroke="#c6a"/><rect x="18" y="36" width="28" height="3" fill="#f9c"/>'],
    ['thanks', 'Thank You!', '#efe', '<path d="M32 44 L18 30 A7 7 0 0 1 32 21 A7 7 0 0 1 46 30 Z" fill="#f36"/><circle cx="14" cy="14" r="3" fill="#fd0"/><circle cx="50" cy="12" r="2" fill="#fd0"/><circle cx="52" cy="46" r="2.5" fill="#fd0"/>'],
    ['mill', 'Happy New Millennium!', '#013', '<text x="32" y="36" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#fd0">2000</text><g fill="#fff"><circle cx="10" cy="10" r="1"/><circle cx="54" cy="8" r="1"/><circle cx="48" cy="50" r="1"/><circle cx="14" cy="48" r="1"/></g><path d="M10 20l4 -6M54 22l-4 -7M32 12v-6" stroke="#f6c" stroke-width="1.5"/>'],
    ['well', 'Get Well Soon!', '#ffd', '<circle cx="32" cy="28" r="14" fill="#fd0" stroke="#c90"/><circle cx="27" cy="25" r="1.6"/><circle cx="37" cy="25" r="1.6"/><path d="M26 32q6 5 12 0" fill="none" stroke="#000" stroke-width="1.2"/><rect x="40" y="36" width="10" height="4" fill="#fff" stroke="#999" transform="rotate(-20 45 38)"/>']
  ];
  const cardSvg = (c, w = 192) => `<svg width="${w}" height="${w * 60 / 64}" viewBox="0 0 64 60" style="max-width:100%"><rect width="64" height="60" fill="${c[2]}" stroke="#999"/>${c[3]}<text x="32" y="57" text-anchor="middle" font-family="Arial" font-weight="700" font-size="6" fill="${c[2] === '#013' ? '#fff' : '#333'}">${c[1]}</text></svg>`;
  reg(U.ecard, h => ({ title: 'E-Card Corner: Send a Free Greeting Card!', cls: 'w00', blocks: [
    style('@keyframes wxe-pop{0%{transform:scale(.2) rotate(-20deg);opacity:0}70%{transform:scale(1.08) rotate(3deg)}100%{transform:none;opacity:1}}.wxe .pick{display:flex;flex-wrap:wrap;gap:8px}.wxe .pick button{background:#fff;border:3px solid #ccc;padding:4px;cursor:pointer}.wxe .pick button.on{border-color:#f60}.wxe .sent{animation:wxe-pop .8s ease-out;border:4px double #f60;background:#fff;padding:10px;text-align:center;max-width:22rem;margin:10px auto}@media (prefers-reduced-motion:reduce){.wxe .sent{animation:none}}'),
    top('E-Card Corner', 'Free greeting cards! No stamps! No paper cuts!', 'linear-gradient(#f93,#c50)'),
    `<div class="pd wxe"><h2>1. Pick a card</h2><div class="pick">${CARDS.map((c, i) => `<button data-card="${i}" aria-label="${c[1]}"${i ? '' : ' class="on"'}>${cardSvg(c, 110)}</button>`).join('')}</div>
      <h2>2. Write your message</h2><p><label>To (your friend's name): <input type="text" maxlength="30" data-to size="20"></label></p><p><label>From (your name): <input type="text" maxlength="30" data-from size="20"></label></p><p><label>Message:<br><textarea rows="3" cols="40" maxlength="200" data-msg style="max-width:100%">Thinking of you!</textarea></label></p>
      <p><button class="btn" data-send><b>Send my e-card!</b></button></p><div data-out></div></div>`,
    `<p class="pd" style="font-size:11px;color:#666">Cards sent from this computer: <span data-count>${h.store.get('ecards', 0)}</span>. In 2000 you'd type your friend's email address here. They'd get an email saying "You have received an e-card!", which looked exactly like junk mail, so they'd never open it.</p>${foot(h)}`
  ], after(root) {
    let pick = 0;
    root.querySelectorAll('[data-card]').forEach(b => b.onclick = () => { pick = +b.dataset.card; root.querySelectorAll('[data-card]').forEach(x => x.classList.toggle('on', x === b)); });
    root.querySelector('[data-send]').onclick = () => {
      const to = root.querySelector('[data-to]').value.trim(), from = root.querySelector('[data-from]').value.trim(), msg = root.querySelector('[data-msg]').value.trim();
      const out = root.querySelector('[data-out]');
      if (!to || !from) { out.innerHTML = '<p style="color:#c00">Please fill in who the card is to and from.</p>'; return; }
      const n = h.store.get('ecards', 0) + 1; h.store.set('ecards', n); root.querySelector('[data-count]').textContent = n;
      out.innerHTML = `<p><b>Your e-card is on its way!</b> Here's what ${h.esc(to)} will see:</p><div class="sent">${cardSvg(CARDS[pick])}<p>Dear ${h.esc(to)},</p><p>${h.esc(msg).replace(/\n/g, '<br>')}</p><p>From, ${h.esc(from)}</p></div>`;
    };
  } }), [{ title: 'E-Card Corner: Free Greeting Cards', desc: 'Send a free e-card: birthday, thank you, get well, or happy new millennium.', keywords: 'ecard e-card greeting card cards birthday thank you send free', cat: 'fun' }]);

  /* ---------- fantasy football league ---------- */
  const TEAMS = [['Bingo Bandits', 'Grandma Jo', 8, 1, 1204], ['Partly Cloudy', 'Earl', 6, 3, 1099], ['Dot-Com Bombers', 'KevRocks22', 5, 4, 1041], ['Chicago Wind Chill', 'DanaBanana', 4, 5, 998], ['Frag Squad', 'DoomDude', 2, 7, 911], ['The Busy Signals', 'xXSk8terXx', 2, 7, 887]];
  reg(U.fantasy, h => ({ title: 'Fantasy League Central', cls: 'w00', blocks: [
    top('Fantasy League Central', 'Prairie Friends &amp; Family Fantasy Football League · Week 9', 'linear-gradient(#264,#132)'),
    `<div class="pd"><p><b>How it works:</b> Everybody "drafts" a team of real players. When those players do well in real games, your fantasy team scores points. It's football, but with more spreadsheets.</p></div>`,
    `<div class="pd"><h2>Standings</h2><table border="1" cellpadding="5" style="border-collapse:collapse;width:100%"><tr style="background:#dfd"><th>#</th><th>Team</th><th>Owner</th><th>W</th><th>L</th><th>Points</th></tr>${TEAMS.map((t, i) => `<tr><td>${i + 1}</td><td><b>${t[0]}</b></td><td>${t[1]}</td><td>${t[2]}</td><td>${t[3]}</td><td>${t[4].toLocaleString()}</td></tr>`).join('')}</table></div>`,
    `<div class="cols"><div class="box"><h3>LEAGUE MESSAGE BOARD</h3><div><b>KevRocks22:</b> how is Grandma in first place<br><b>Grandma Jo:</b> I PICK THE PLAYERS WITH THE NICEST SMILES DEAR<br><b>Earl:</b> I pick by the weather forecast. Going well.<br><b>DoomDude:</b> my whole team got hurt. all of them. at once.</div></div>
      <div class="box"><h3>TRADE CENTER</h3><div>Want to trade with the league leader? <button class="btn" data-trade>Propose a trade to Grandma Jo</button></div></div></div>`,
    foot(h)
  ], after(root) {
    root.querySelector('[data-trade]').onclick = () => h.msgBox('Trade Proposal', 'Grandma Jo has rejected your trade.\n\nHer message: "NO THANK YOU DEAR. WOULD YOU LIKE A COOKIE INSTEAD."', ['OK']);
  } }), [{ title: 'Fantasy League Central', desc: 'Fantasy football standings. Grandma Jo is in first place somehow.', keywords: 'fantasy football sports league standings trade team', cat: 'sports' }]);

  /* ---------- game news and reviews of the store's games ---------- */
  const REVIEWS = [
    ['Tiny Town', 'Brickwork Pixel Co.', 2000, 'City builder', 9, 'Zone it, power it, watch it grow. Our reviewer built a town, forgot to build a power plant, and learned a valuable lesson about electricity. Hours vanish.'],
    ['Globe Detective', 'Compass Rose Interactive', 1995, 'Geography mystery', 8, 'Chase a thief around the world using clues about flags, money and landmarks. You will accidentally learn geography. We did.'],
    ['The Information Superhighway Trail', 'Byteway Learning Co.', 1995, 'Adventure / strategy', 8, 'Get from 1990 to the year 2000 without running out of snacks. A surprisingly tense journey through the history of getting online.'],
    ['SkyBlast', 'Nebula Softworks', 1990, 'Arcade shooter', 7, 'A RETRO REVIEW: this 1990 space shooter still holds up. Smart bombs, a mothership every fifth wave, and a shareware version that everybody had.'],
    ['Spin &amp; Solve', 'Marquee Lights Software', 1990, 'TV game show', 7, 'Spin the wheel, call a letter, solve the puzzle. Our editor solved one with only two letters showing and has not stopped talking about it.'],
    ['Number Muncher', 'Brightleaf Learning Co.', 1990, 'Educational math', 8, 'Munch the multiples, dodge the Glitches. The rare math game that kids ask to play again.']
  ];
  reg(U.games, h => ({ title: 'Pixel Pulse: Game News & Reviews', cls: 'w00', popup: true, blocks: [
    top('Pixel Pulse', 'Game news, reviews and cheat codes (no cheat codes)', 'linear-gradient(#306,#103)'),
    `<div class="tick"><span>NEWS: LAN parties sweep the nation; parents discover 14 computers in the basement &nbsp;·&nbsp; Games now ship on CD-ROM, some on four of them &nbsp;·&nbsp; Study finds "one more turn" is never one more turn</span></div>`,
    `<div class="pd"><h2>Reviews</h2>${REVIEWS.map(r => `<div style="border-bottom:1px solid #ccd;padding:6px 0"><b style="font:700 15px Arial">${r[0]}</b> <small>${r[1]} · ${r[2]} · ${r[3]}</small><br><span style="display:inline-block;background:#306;color:#fff;font:700 13px Arial;padding:1px 6px;margin:3px 0">${r[4]}/10</span> ${r[5]}</div>`).join('')}</div>`,
    `<div class="pd"><p><b>Want these games?</b> ${h.APP('store', 'Get them in the Software Store')}. Older games still run on your new computer!</p></div>`,
    foot(h)
  ]}), [{ title: 'Pixel Pulse: Game News and Reviews', desc: 'Reviews of Tiny Town, Globe Detective, SkyBlast, Number Muncher and more.', keywords: 'games game reviews news video games review tiny town skyblast globe detective number muncher spin solve trail computer games', cat: 'games' }]);

  /* ---------- an auction item page with a bidding war ---------- */
  reg(U.item, h => ({ title: 'BidBarn Item #40211: Grilled cheese sandwich shaped like a modem', cls: 'w00', blocks: [
    top('BidBarn', "The world's online yard sale", 'linear-gradient(#2a9d2a,#146414)'),
    `<div class="pd"><h1>Grilled cheese sandwich shaped like a modem</h1><table><tr><td><svg class="img" data-kb="35" width="200" height="130" viewBox="0 0 40 26" style="max-width:100%"><rect width="40" height="26" fill="#eef"/><rect x="5" y="7" width="30" height="13" rx="2" fill="#d9a441" stroke="#8a5a1a"/><rect x="7" y="9" width="26" height="9" rx="1" fill="#f0c060"/><g fill="#8a5a1a"><rect x="10" y="15" width="2" height="1"/><rect x="14" y="15" width="2" height="1"/><rect x="18" y="15" width="2" height="1"/></g><rect x="26" y="15" width="4" height="1" fill="#c00"/></svg></td><td style="padding-left:12px">
      <p>Current bid: <b data-price>$3.00</b><br>Bids: <span data-bids>4</span><br>Time left: <b data-left>1 min 00 sec</b><br>High bidder: <span data-who>sniper4000</span></p></td></tr></table>
      <p><b>Seller's description:</b> I made a grilled cheese and it looks EXACTLY like my 28.8 modem. Even has the little lights. Slightly eaten (one corner). Will ship in a sandwich bag.</p>
      <p><label>Your maximum bid: $<input type="text" size="6" maxlength="6" data-max value="5.00" aria-label="Your maximum bid"></label> <button class="btn" data-bid><b>Place bid</b></button></p><p data-msg style="font-weight:700"></p></div>`,
    `<p class="pd">${A(h, U.bid, 'Back to BidBarn')} · ${foot(h).replace(/<\/?p[^>]*>/g, '')}</p>`
  ], after(root) {
    let price = 3, bids = 4, who = 'sniper4000', my = 0, left = 60, done = false;
    const SNIPER_MAX = 12.5;
    const $ = s => root.querySelector(s);
    const show = () => { $('[data-price]').textContent = '$' + price.toFixed(2); $('[data-bids]').textContent = bids; $('[data-who]').textContent = who; $('[data-left]').textContent = done ? 'Ended' : `${Math.floor(left / 60)} min ${String(left % 60).padStart(2, '0')} sec`; };
    const t = setInterval(() => {
      if (!root.isConnected) { clearInterval(t); return; }
      left--;
      if (left === 1 && who !== 'sniper4000' && my < SNIPER_MAX) { price = Math.min(SNIPER_MAX, my + 0.5); who = 'sniper4000'; bids++; }
      if (left <= 0) {
        clearInterval(t); done = true; $('[data-bid]').disabled = true;
        $('[data-msg]').textContent = who === h.user ? `You won! You now own a grilled cheese sandwich for $${price.toFixed(2)}. Shipping: $45.00.` : 'Auction over. sniper4000 swooped in with one second left. That happened a LOT on auction sites.';
      }
      show();
    }, 1000);
    $('[data-bid]').onclick = () => {
      const v = Math.round(parseFloat($('[data-max]').value.replace(/[^0-9.]/g, '')) * 100) / 100;
      if (!(v > price)) { $('[data-msg]').textContent = `Your bid must be more than $${price.toFixed(2)}.`; return; }
      my = v; bids++;
      if (v < SNIPER_MAX && left > 5) { price = Math.min(SNIPER_MAX, v + 0.25); who = 'sniper4000'; bids++; $('[data-msg]').textContent = 'You were instantly outbid by sniper4000. Try a higher maximum!'; }
      else { price = v >= SNIPER_MAX ? Math.min(v, Math.max(price, SNIPER_MAX) + 0.25) : Math.min(v, price + 0.25); who = h.user; $('[data-msg]').textContent = v >= SNIPER_MAX ? "You're the high bidder! sniper4000 can't beat that." : "You're the high bidder! Don't look away..."; }
      show();
    };
    show();
  } }), [{ title: 'BidBarn: Grilled cheese sandwich shaped like a modem', desc: 'A real auction! Beat sniper4000 before time runs out.', keywords: 'auction bid bidding bidbarn grilled cheese sandwich modem item sniper', cat: 'shopping' }]);

  /* ---------- leftover Y2K page ---------- */
  reg(U.y2k, h => {
    const now = new Date(), since = Math.floor((new Date(2000, now.getMonth(), now.getDate()) - new Date(2000, 0, 1)) / 864e5);
    return { title: 'Y2K IS COMING!!! Are YOU Ready?', cls: 'w00', blocks: [
      style('.wxy{background:#000;color:#0f0;font:14px "Courier New",monospace;padding:10px 14px}.wxy h1{color:#f00;font:900 30px "Arial Black",Arial;text-align:center;animation:blink 1s steps(1) infinite}.wxy .note{background:#ff0;color:#000;font:15px "Comic Sans MS",cursive;padding:8px;transform:rotate(-2deg);margin:12px auto;max-width:26rem;box-shadow:3px 3px 0 #666}@media (prefers-reduced-motion:reduce){.wxy h1{animation:none}}'),
      `<div class="wxy"><h1>Y2K IS COMING!!!</h1><p style="text-align:center">DAYS UNTIL Y2K: <b style="font-size:22px">${since ? '-' + since : '0'}</b></p><p style="text-align:center"><small>Last updated: December 30, 1999, 11:48 PM</small></p></div>`,
      `<div class="wxy"><h2>WHAT IS Y2K?</h2><p>Many old computer programs saved years with only two digits, like "99" for 1999. When the year 2000 arrives, some programs might think "00" means 1900! Bank accounts, clocks and elevators could get confused.</p><h2>MY Y2K SURVIVAL CHECKLIST</h2><ul><li>[X] 40 gallons of water</li><li>[X] 300 cans of beans</li><li>[X] Hand-crank radio</li><li>[X] Printed out the whole Internet (took 2 days)</li><li>[ ] Explain all this to my wife</li></ul></div>`,
      `<div class="wxy"><div class="note">UPDATE, JAN 1, 2000: Everything is fine. The lights stayed on. Programmers spent years fixing the old code before the deadline, and it worked. Does anybody want 300 cans of beans?</div></div>`,
      `<div class="wxy"><p>${A(h, U.cyber, 'CyberBurbs')} · ${A(h, U.news, 'The Daily Byte')}</p></div>`
    ]};
  }, [{ title: 'Y2K IS COMING!!! Survival Headquarters', desc: 'A Y2K survival page that has not been updated since December 30, 1999.', keywords: 'y2k year 2000 millennium bug computer survival checklist', cat: 'web' }]);

  /* ---------- MP3 FAQ ---------- */
  reg(U.mp3, h => {
    const fast = h.conn().kind === 'dsl';
    return { title: 'PrairieNet Help: MP3 FAQ', cls: 'w00', blocks: [
      top('PrairieNet Help', 'Frequently Asked Questions about MP3 music files'),
      `<div class="pd"><h2>What is an MP3?</h2><p>An MP3 is a music file that has been squeezed (compressed) so it's about ten times smaller than the same song on a CD, while still sounding pretty good. At normal quality, one minute of music takes about 1 MB, so a 4-minute song is about 4 MB.</p>
        <h2>How long does a song take to download?</h2><p>On a 56K modem (about 5 KB per second), a 4 MB song takes about 13 minutes. On DSL at 768 Kbps, it takes less than a minute. ${fast ? 'You have DSL, so you already know.' : 'You are on dial-up, so make a sandwich.'}</p>
        <h2>How many songs fit on a CD?</h2><p>A blank CD-R holds about 650 MB. That's about 74 minutes as a regular music CD, or more than 150 MP3 songs as files!</p>
        <h2>Is it OK to share songs?</h2><p>Only with permission. Copying and sharing music without permission from whoever owns it is against copyright law, even if lots of people are doing it. Many bands now put free songs on their own websites, and that's a great place to start.</p>
        <h2>How do I play an MP3?</h2><p>Use ${h.APP('jb', 'the Jukebox')}. Songs you download from ${A(h, U.depot, 'Download Depot')} show up there.</p></div>`,
      foot(h)
    ]};
  }, [{ title: 'MP3 FAQ: What is an MP3?', desc: 'How big MP3 songs are, how long they take to download, and whether sharing is OK.', keywords: 'mp3 music songs download faq help jukebox cd burn sharing copyright', cat: 'music' }]);

  /* ---------- quiz: which dot-com are you? ---------- */
  const QS = [
    ['Your ideal lunch is:', ['Free pizza at the office', 'Whatever my mascot is eating', 'Something I won in an auction', "Nobody knows. That's the point."]],
    ['Your favorite sound is:', ['A cute little "beep boop"', 'Applause', 'Going... going... GONE!', 'Stock ticker noises']],
    ['Pick a pet:', ['A virtual pet', 'A sock puppet', 'A used hamster (like new)', 'An idea for a pet']],
    ['Your business plan is:', ['Make people smile', 'Be on TV a lot', 'Sell everything to everyone', 'Add ".com" to it']],
    ['On a Friday night you:', ['Feed my pixels', 'Practice my TV ad', 'Snipe auctions at 11:59', 'Check my stock price 400 times']]
  ];
  const RESULTS = [
    ['PixelPets.com', "You're cute, loved by grandmas everywhere, and have a foosball table. Revenue: coming soon!"],
    ['SockPuppet.net', "Your mascot is more famous than you are. Everybody knows your jingle. Nobody knows what you sell."],
    ['BidBarn', "You love a bargain and you never give up. You have 14 lava lamps and you regret nothing."],
    ['Dot-Com Holdings', "Nobody knows what you do, including you, but your stock went up 300% this morning."]
  ];
  reg(U.quiz, h => ({ title: 'QuizMania 2000: Which Dot-Com Are You?', cls: 'w00', blocks: [
    top('QuizMania 2000', 'Fun quizzes! Totally scientific! (Not scientific.)', 'linear-gradient(#90c,#406)'),
    `<div class="pd"><h1>Which Dot-Com Are You?</h1><form data-quiz>${QS.map((q, i) => `<fieldset style="margin:8px 0;border:1px solid #ccd"><legend><b>${i + 1}. ${q[0]}</b></legend>${q[1].map((a, j) => `<label style="display:block;padding:3px 0"><input type="radio" name="q${i}" value="${j}"> ${a}</label>`).join('')}</fieldset>`).join('')}<button class="btn" type="submit"><b>Tell me which dot-com I am!</b></button></form><div data-res></div></div>`,
    foot(h)
  ], after(root) {
    const f = root.querySelector('[data-quiz]');
    f.onsubmit = e => {
      e.preventDefault();
      const n = [0, 0, 0, 0]; let answered = 0;
      QS.forEach((q, i) => { const c = f.querySelector(`input[name=q${i}]:checked`); if (c) { n[+c.value]++; answered++; } });
      const out = root.querySelector('[data-res]');
      if (answered < QS.length) { out.innerHTML = `<p style="color:#c00">Answer all ${QS.length} questions first! (You answered ${answered}.)</p>`; return; }
      const best = n.indexOf(Math.max(...n)), r = RESULTS[best];
      out.innerHTML = `<div style="border:3px solid #90c;background:#f8f0ff;padding:10px;margin-top:10px"><h2 style="margin-top:0">You are... ${r[0]}!</h2><p>${r[1]}</p><p style="font-size:11px;color:#666">Copy this into your away message: "I took the quiz and I'm ${r[0]}!"</p></div>`;
      out.scrollIntoView({ block: 'nearest' });
    };
  } }), [{ title: 'QuizMania 2000: Which Dot-Com Are You?', desc: 'Take the quiz and find out which dot-com company you are.', keywords: 'quiz quizzes personality test fun which dot-com are you', cat: 'fun' }]);

  /* ---------- horoscopes (the PrairieNet 2000 portal links here) ---------- */
  const SIGNS = [
    ['Aries', 'Mar 21 - Apr 19', 'A bold move pays off. Try clicking the "Skip Intro" button before the intro even starts.'],
    ['Taurus', 'Apr 20 - May 20', 'Comfort is important to you. So is a download that finishes before bedtime.'],
    ['Gemini', 'May 21 - Jun 20', 'You will have two conversations at once. Probably in two instant-message windows.'],
    ['Cancer', 'Jun 21 - Jul 22', 'Home is where the heart is. Also where the phone line is. Stay near it.'],
    ['Leo', 'Jul 23 - Aug 22', 'The spotlight finds you. Update your home page, people are looking at it (3 people).'],
    ['Virgo', 'Aug 23 - Sep 22', 'Your desktop needs organizing. The 47 icons will not organize themselves.'],
    ['Libra', 'Sep 23 - Oct 22', "Balance work and play. Close the pop-up ads. Then close the ones behind them."],
    ['Scorpio', 'Oct 23 - Nov 21', 'A mystery is solved. It was your little brother who picked up the phone.'],
    ['Sagittarius', 'Nov 22 - Dec 21', 'Adventure calls! It is probably a free trial CD in your mailbox.'],
    ['Capricorn', 'Dec 22 - Jan 19', 'Hard work is rewarded. Your 56K modem connects at a full 50K today.'],
    ['Aquarius', 'Jan 20 - Feb 18', "You're ahead of your time. Everyone will have a weblog someday. You'll see."],
    ['Pisces', 'Feb 19 - Mar 20', 'Go with the flow. The FishCam fish have been doing it for five years.']
  ];
  reg(U.stars, h => ({ title: 'PrairieNet Horoscopes', cls: 'w00', popup: true, blocks: [
    top('PrairieNet Horoscopes', "What the stars say about your day online", 'linear-gradient(#228,#003)'),
    `<div class="cols">${SIGNS.map(s => `<div class="box"><h3>${s[0].toUpperCase()} <span style="font-weight:400">(${s[1]})</span></h3><div>${s[2]}</div></div>`).join('')}</div>`,
    `<p class="pd" style="font-size:11px;color:#666">Horoscopes are just for fun. Scientists have found no evidence that stars and planets can predict your day. The stars also do not know about your modem.</p>${foot(h)}`
  ]}), [{ title: 'PrairieNet Horoscopes', desc: 'Daily horoscopes for all twelve signs (just for fun).', keywords: 'horoscope horoscopes astrology stars zodiac signs aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces', cat: 'fun' }]);
})();
