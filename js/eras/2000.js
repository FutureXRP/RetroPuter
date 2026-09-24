/* 2000: Horizon 2000, a 56K modem or brand-new DSL, instant messages, MP3s and pop-up ads. */
(window.RETRO_ERAS = window.RETRO_ERAS || []).push((() => {
const SITES = {
  home: 'http://www.prairienet.com/',
  finder: 'http://www.webfinder.com/',
  kevin: 'http://www.pixelpets.com/',
  blog: 'http://www.pixelpets.com/kevin/weblog.html',
  guest: 'http://www.pixelpets.com/guestbook.html',
  news: 'http://www.dailybyte.com/',
  shack: 'http://www.downloaddepot.com/',
  bid: 'http://www.bidbarn.com/'
};
const GUESTS = [
  { n: 'Dana', w: 'Chicago', m: 'Kev!! A real company!! Do I get free stock if I sign this?' },
  { n: 'DoomDude', w: 'Austin', m: 'Your intro took 3 minutes to load on my 56K. Worth it. The cat dances.' },
  { n: 'Grandma Jo', w: 'Kansas', m: 'Kevin I adopted a PixelPet. His name is Biscuit. How do I feed him. Love, Grandma (I am on the email now)' }
];
const LOGO = `<svg width="30" height="30" viewBox="0 0 30 30" style="vertical-align:middle"><circle cx="15" cy="15" r="14" fill="#fff"/><path d="M5 18a10 10 0 0 1 20 0z" fill="#ff7400"/><rect x="3" y="19" width="24" height="2" fill="#036"/><rect x="6" y="23" width="18" height="2" fill="#036"/></svg>`;
const PETPIC = `<svg class="img" data-kb="55" width="300" height="160" viewBox="0 0 60 32" style="max-width:100%"><rect width="60" height="32" fill="#ffe6f2"/><circle cx="30" cy="18" r="10" fill="#f9c"/><circle cx="22" cy="9" r="4" fill="#f9c"/><circle cx="38" cy="9" r="4" fill="#f9c"/><circle cx="26" cy="16" r="1.6" fill="#000"/><circle cx="34" cy="16" r="1.6" fill="#000"/><path d="M26 21q4 3 8 0" fill="none" stroke="#000" stroke-width="1"/><text x="30" y="31" font-size="3.4" text-anchor="middle" fill="#f06" font-family="Arial" font-weight="700">BISCUIT says HI!</text></svg>`;
const ADBANNER = `<svg class="img" data-kb="24" width="468" height="60" viewBox="0 0 468 60" style="max-width:100%"><rect width="468" height="60" fill="#003"/><text x="234" y="26" fill="#ff0" font-family="Arial" font-weight="700" font-size="20" text-anchor="middle">CLICK THE DUCK, WIN $20!*</text><text x="234" y="46" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">*there is no duck. there is no $20. this is a banner ad.</text></svg>`;
const SONG = {
  disco: { mel: [64, 0, 67, 0, 71, 0, 67, 64, 62, 0, 66, 0, 69, 0, 66, 62], bass: [40, 40, 38, 38], step: 0.13, lead: 'sawtooth', leadVol: 0.022, bassType: 'square', bassVol: 0.05, drums: 'four' },
  bug: { mel: [69, 72, 76, 72, 69, 72, 76, 79, 77, 74, 69, 74, 77, 74, 72, 71], bass: [45, 41, 38, 40], step: 0.15, lead: 'square', leadVol: 0.025, harm: 12, drums: 'four' },
  kev: { mel: [72, 76, 79, 76, 77, 81, 84, 81, 79, 76, 72, 76, 74, 71, 67, 71], bass: [48, 53, 55, 43], step: 0.14, lead: 'triangle', leadVol: 0.07, drums: 'four' },
  depot: { mel: [74, 0, 74, 77, 0, 79, 81, 0, 79, 77, 74, 0, 72, 74, 0, 0], bass: [38, 41, 43, 36], step: 0.14, lead: 'square', leadVol: 0.03, harm: 7, bassType: 'sawtooth', bassVol: 0.04, drums: 'four' },
  pets: { mel: [76, 79, 84, 79, 76, 79, 84, 88, 86, 84, 79, 76, 77, 79, 76, 72], bass: [48, 45, 41, 43], step: 0.16, lead: 'triangle', leadVol: 0.05, drums: 'four' }
};

function page(url, h) {
  const { A, APP, esc } = h;
  const hits = h.store.get('hits', 2940117);
  const fast = h.conn().kind === 'dsl';
  switch (url) {
    case SITES.home:
      h.store.set('hits', hits + 1);
      return { title: 'PrairieNet: Your Portal to Everything', cls: 'w00', popup: true, blocks: [
        `<div class="top">${LOGO} PrairieNet <small>Welcome back, ${esc(h.user)}! It's the year 2000.</small></div><div class="nav">${A(SITES.news, 'News')} ${A(SITES.shack, 'Downloads')} ${A(SITES.bid, 'Auctions')} ${A(SITES.finder, 'Search')} ${APP('im', 'Messenger')} ${A('http://www.prairienet.com/horoscopes/', 'Horoscopes')}</div>`,
        `<div class="tick"><span>PXLP PixelPets.com <b class="up">▲ 42%</b> &nbsp;·&nbsp; DOTC Dot-Com Holdings <b class="up">▲ 18%</b> &nbsp;·&nbsp; BRCK Brick &amp; Mortar Inc <b class="dn">▼ 3%</b> &nbsp;·&nbsp; SOCK SockPuppet.net <b class="up">▲ 61%</b> &nbsp;·&nbsp; Nobody knows what any of these companies do</span></div>`,
        `<div class="pd" style="text-align:center">${ADBANNER}</div>`,
        `<div class="cols">
          <div class="box"><h3>TOP STORIES</h3><div>${A(SITES.news, 'Y2K: The world did not end')}<br>${A(SITES.news, 'Dot-coms buy up every TV ad')}<br>${A(SITES.news, 'Is DSL worth it?')}</div></div>
          <div class="box"><h3>HOT DOWNLOADS</h3><div>${A(SITES.shack, 'SONG.MP3')} (3.5 MB)<br>${A(SITES.shack, 'Movie trailer')} (18 MB)<br>${A(SITES.shack, 'SkyBlast 2000 demo')} (42 MB)</div></div>
          <div class="box"><h3>BUDDY MESSENGER</h3><div>3 of your buddies are online. ${APP('im', 'Send an instant message')}</div></div>
          <div class="box"><h3>WEATHER</h3><div>Prairie City: 34°F, cloudy<br>Tomorrow: flurries</div></div>
          <div class="box"><h3>SPOTLIGHT</h3><div>${A(SITES.kevin, 'PixelPets.com')}: adopt a virtual pet! Local kid makes it big.<br>${A(SITES.bid, 'BidBarn')}: buy anything from anyone.</div></div>
          <div class="box"><h3>FUN STUFF</h3><div>${A('http://www.quizmania2000.com/', 'Quiz: Which dot-com are you?')}<br>${A('http://www.ecardcorner.com/', 'Send a free e-card')}<br>${A('http://www.prairienet.com/horoscopes/', 'Horoscopes')}<br>${A('http://www.pixelpulse.com/', 'Game reviews')}<br>${A('http://www.weblogworld.com/', 'Weblog directory')}<br>${A('http://www.cyberburbs.com/', 'Free home pages')}</div></div>
          <div class="box"><h3>YOUR CONNECTION</h3><div>${fast ? 'DSL: pages load before you can blink.' : 'Dial-up at ' + h.fmtBps(h.effBps()) + '. Tired of waiting? Ask about DSL!'}</div></div>
        </div>`,
        `<p class="pd" style="text-align:center;color:#666;font-size:11px">Visitor #${(hits + 1).toLocaleString()} · © 2000 PrairieNet · Make PrairieNet your home page!</p>`
      ]};
    case SITES.finder:
      return { title: 'WebFinder', cls: 'w00', blocks: [
        `<div class="srch"><p class="logo"><span style="color:#36c">Web</span><span style="color:#c30">Finder</span></p><p style="color:#666">Searching 1,016,934,000 web pages</p><form data-search><input type="text" name="q" aria-label="Search words"> <button class="btn" type="submit">WebFind It</button> <button class="btn" type="button" data-rand>Surprise Me</button></form></div>`,
        `<div class="pd" data-results></div><p class="pd" style="text-align:center;font-size:11px;color:#777">No flashing ads, no clutter. Just search. What a strange idea.</p>`
      ], after(root) {
        const f = root.querySelector('[data-search]'), out = root.querySelector('[data-results]');
        const run = q => {
          const slug = q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'nothing';
          const found = h.search(q).slice(0, 8);
          out.innerHTML = `<p style="border-top:1px solid #36c;padding-top:4px;font-size:11px">Results 1 - ${found.length + 5} of about <b>${(1200 + slug.length * 88131).toLocaleString()}</b> for <b>${esc(q)}</b>. (0.18 seconds)</p><ol>${found.map(e => `<li>${A(e.url, esc(e.title))}<br><small>${esc(e.desc || '')}</small><br><small style="color:#080">${esc(e.url.replace(/^http:\/\//, ''))}</small></li>`).join('')}
            <li>${A('http://www.' + slug + '.com/', esc(q) + '.com: Everything about ' + esc(q))}<br><small style="color:#080">www.${esc(slug)}.com/</small></li>
            <li>${A(SITES.bid, esc(q) + ' on BidBarn: 312 auctions ending soon')}</li>
            <li>${A(SITES.news, 'The Daily Byte: The ' + esc(q) + ' bubble?')}</li>
            <li>${A('http://www.cyberburbs.com/siliconhills/4077/', "Kevin's Kool Kyber Korner (1995, abandoned)")}</li>
            <li>${A(SITES.kevin, 'PixelPets.com: Does your pet like ' + esc(q) + '?')}</li></ol>`;
        };
        f.onsubmit = e => { e.preventDefault(); const q = f.q.value.trim(); if (q) run(q); };
        root.querySelector('[data-rand]').onclick = () => { const q = ['dancing hamsters', 'y2k bunker', 'mp3', 'boy bands', 'pixelpets']; f.q.value = q[Math.random() * q.length | 0]; run(f.q.value); };
      }};
    case SITES.kevin:
      return { title: 'PixelPets.com: Adopt a Pet Online!', cls: 'pix', music: SONG.pets, blocks: [
        `<div class="intro" data-intro><span class="spin3">★</span> PIXELPETS.COM <span class="spin3">★</span><br><small style="font-weight:400">loading the future of pets...</small><br><br><button class="btn" data-skip>Skip Intro</button></div>`,
        `<h1>PixelPets.com</h1><p><b>Adopt a virtual pet. Feed it. Love it. Forever.*</b><br><small>*or until we run out of money</small></p>`,
        `<p>${PETPIC}</p>`,
        `<div class="deal"><b>Founder's note from Kevin (age 22):</b><br>Remember my home pages from 1990 and 1995? Now I have a whole company. We just raised <b>$20 million</b>! We have 40 employees, a foosball table, and 5,000 T-shirts. Customers: coming soon! Revenue: also coming soon!</div>`,
        `<h2>Why PixelPets?</h2><ul><li>No litter box</li><li>Lives on the Internet</li><li>Our stock went up 42% yesterday for reasons nobody can explain</li><li>Watch for our Super Bowl ad!</li></ul>`,
        `<p>${A(SITES.blog, "Read Kevin's weblog")} · ${A(SITES.guest, 'Sign our guestbook')} · ${APP('im', 'IM Kevin')}</p><p><button class="btn" data-stopmusic>Mute the theme song</button></p>`
      ], after(root) {
        root.querySelector('[data-skip]').onclick = () => root.querySelector('[data-intro]').remove();
        const b = root.querySelector('[data-stopmusic]'); b.onclick = () => { h.stopMusic('web'); b.disabled = true; b.textContent = 'Muted'; };
      }};
    case SITES.blog:
      return { title: "Kevin's Weblog", cls: 'w00', blocks: [
        `<div class="pd"><h1>Kevin's Weblog</h1><p style="color:#666">A "weblog" is like a diary, but online, and anyone can read it. People are starting to call them "blogs".</p></div>`,
        `<div class="pd"><h2>Jan 1, 2000, 12:04 AM</h2><p>Y2K happened. Nothing broke. My dad filled the basement with bottled water, so we're set until about 2004.</p><h2>Dec 20, 1999</h2><p>Grandma is on email now! She writes in ALL CAPS and signs every message "Love, Grandma (this is Grandma)." I also helped her make ${A('http://www.cyberburbs.com/heartland/4455/', 'her very own home page')}.</p><h2>Nov 3, 1999</h2><p>Found my old 1995 home page. The black background. The MIDI. I can't believe I made that. I can't believe it's still up.</p><h2>Oct 12, 1999</h2><p>Got DSL at the office! Pages load instantly. I'll never go back to dial-up. (I still have dial-up at home.)</p></div>`,
        `<p class="pd">${A(SITES.kevin, '← Back to PixelPets.com')} · ${A('http://intranet.pixelpets.com/', 'Employee intranet')} · ${A('http://www.weblogworld.com/', 'More weblogs')}</p>`
      ]};
    case SITES.guest:
      return { title: 'PixelPets Guestbook', cls: 'pix', blocks: [
        `<h1>Guestbook</h1><p>Every visitor is a potential customer! ${A(SITES.kevin, 'Back to PixelPets.com')}</p>`,
        `<div data-entries>${h.gb.html(h.gb.list(GUESTS))}</div>`,
        `<h2>Sign it</h2>${h.gb.form()}`
      ], after(root, nv) { h.gb.bind(root, nv, SITES.guest, GUESTS); }};
    case SITES.news:
      return { title: 'The Daily Byte', cls: 'news', popup: true, blocks: [
        `<div class="mast">The Daily Byte <small style="font-size:14px;font-weight:400">· Updated every hour</small></div>`,
        `<table><tr><td style="width:60%"><h2>Y2K: The World Did Not End</h2><p>After years of worry that computers would mix up 2000 and 1900 at midnight, the new year arrived with barely a hiccup. Programmers spent years fixing old code, and it worked. One man's VCR still blinks 12:00, but it always did.</p></td><td><h2>Dot-Coms Everywhere</h2><p>Internet companies are spending millions on TV ads, many for websites with few customers. "Just add dot-com to the name," one investor said. "It's that easy."</p></td></tr></table>`,
        `<hr><h2>DSL and Cable Arrive: No More Busy Signals?</h2><p>New "broadband" connections are up to <b>15 times faster</b> than a 56K modem, and they don't tie up the phone. Most homes still dial up, but that's changing fast.</p><h2>Music Swapping Has Record Labels Worried</h2><p>Millions of people are trading songs as MP3 files. A song that took three hours to download in 1990 now takes about ten minutes on a modem.</p><h2>Phones With Color Screens Coming Soon</h2><p>Some experts say you may one day check the Web on your phone. Others say the screen is too small, and who would want that?</p><p>${A(SITES.home, 'Return to PrairieNet')}</p>`
      ]};
    case SITES.shack:
      return { title: 'Download Depot', cls: 'w00', blocks: [
        `<div class="top" style="background:linear-gradient(#3a6ea5,#0a246a)">Download Depot <small>The biggest files on the Web. Allegedly.</small></div>`,
        `<div class="pd">${h.dlTable([['JOKES.TXT', 3, 'The best jokes of the century'], ['SONG.MP3', 3500, 'Adds a new song to your Jukebox'], ['SCRNSAVE.EXE', 800, 'A screen saver of fish'], ['TRAILER.MOV', 18000, 'A two-minute movie trailer'], ['SKYBLAST2K.EXE', 42000, 'SkyBlast 2000 demo, now in 3D']])}</div>`,
        `<p class="pd"><small>${fast ? 'You have DSL. Must be nice.' : 'On a 56K modem, start the big ones and go to bed. Or get DSL.'}</small></p><p class="pd"><b>Full games:</b> ${APP('store', 'Shop the Download Depot Store')}</p><p class="pd">${A(SITES.home, 'Back to PrairieNet')}</p>`
      ], after(root) { h.bindDownloads(root); }};
    case SITES.bid:
      return { title: 'BidBarn: Buy Anything From Anyone', cls: 'w00', blocks: [
        `<div class="top" style="background:linear-gradient(#2a9d2a,#146414)">BidBarn <small>The world's online yard sale</small></div>`,
        `<div class="pd"><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Item</th><th>Current bid</th><th>Ends</th><th></th></tr>
          ${[['Used 28.8K modem, works great, makes noise', '$1.00', '2 hrs'], ['Y2K survival kit, unopened (did not need it)', '$4.50', '5 hrs'], ['Box of 400 free Internet trial CDs', '$0.01', '1 day'], ['Virtual pet (PixelPets.com gift card)', '$0.75', '3 days'], ['Floppy disks, 50 pack. Remember these?', '$2.25', '6 hrs']].map(([i, p, e]) => `<tr><td>${i}</td><td>${p}</td><td>${e}</td><td><button class="btn" data-bid>Bid</button></td></tr>`).join('')}</table></div>`,
        `<p class="pd"><b>Featured auction:</b> ${A('http://www.bidbarn.com/item/40211.html', 'Grilled cheese sandwich shaped like a modem')} (ends in 1 minute!)</p><p class="pd">${A(SITES.home, 'Back to PrairieNet')}</p>`
      ], after(root) {
        root.querySelectorAll('[data-bid]').forEach(b => b.onclick = () => { b.disabled = true; b.textContent = 'Outbid!'; h.msgBox('BidBarn', 'You were winning for 11 seconds. Then someone named "sniper4000" outbid you with one second left.\n\nOnline auctions were exactly like this.', ['OK'], 'warn'); });
      }};
    default:
      return { title: 'Page Not Found', cls: 'w00', blocks: [
        `<div class="pd"><h1>The page cannot be found</h1><p>The page you are looking for might have been removed, had its name changed, or the dot-com that ran it might have run out of money.</p><p>Please try the following:</p><ul><li>Check the address for typos: <tt>${esc(url)}</tt></li><li>Go to the ${A(SITES.home, 'PrairieNet')} home page</li><li>${A(SITES.finder, 'Search for it on WebFinder')}</li></ul><p style="color:#888">HTTP 404 - File not found</p></div>`
      ]};
  }
}

return {
  id: '2000', year: 2000,
  power: 'The new millennium. Y2K came and went. Pick a 56K modem, or try DSL and see how fast the Web was about to get. MP3s, instant messages, and pop-up ads are everywhere.',
  speedBlurb: '56K modem or DSL',
  os: {
    name: 'Horizon 2000', short: '',
    about: 'Horizon 2000, Millennium Edition\nY2K ready!\n\nMemory: 64 MB\nProcessor: Pentium III, 600 MHz\nDisk: 20 GB\nCD-RW drive: burns your own CDs\nModem: 56K (or DSL!)\n\nDSL is 320 times faster than the 2,400 bps modem from 1990.',
    shutTitle: 'Shut Down Horizon', shutText: 'What do you want the computer to do?\n\nShut down: ends your session so you can safely turn off the computer.',
    startSide: '<b>Horizon</b> 2000'
  },
  shell: 'start',
  apps: ['dial', 'nv', 'im', 'jb', 'readme', 'mines', 'worm', 'paint', 'np', 'cp'],
  quickLaunch: ['nv', 'im', 'jb'],
  sounds: { start: 'chime2000', bye: 'bye2000' },
  saver: 'bounce', saverText: 'Horizon 2000', saverName: 'Bouncing logo',
  walls: [['blue', '#3a6ea5', 'Horizon blue'], ['teal', '#008080', 'Teal'], ['aurora', 'linear-gradient(135deg,#0a246a,#3a6ea5 50%,#6fb0d0)', 'Aurora'], ['black', '#000', 'Black']],
  splash: `<div class="splash00"><div class="mid">
      <svg viewBox="0 0 48 30" aria-hidden="true"><defs><linearGradient id="s00" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffec80"/><stop offset="1" stop-color="#ff6a00"/></linearGradient></defs><path d="M6 16a18 14 0 0 1 36 0z" fill="url(#s00)"/><rect x="0" y="17" width="48" height="2" fill="#a6caf0"/><rect x="5" y="21" width="38" height="2" fill="#a6caf0" opacity=".8"/><rect x="11" y="25" width="26" height="2" fill="#a6caf0" opacity=".6"/></svg>
      <p class="name">Horizon <span>2000</span></p><p class="ed">Millennium Edition</p>
      <div class="pbar"><i></i></div>
      <p class="copy">© 1985–2000 Horizon Software Corp. Y2K compliant.</p>
    </div></div>`,
  async boot(B) {
    if (!await B.wait(400)) return;
    await B.type('Cardinal BIOS v6.00PG  (C) 1999 Cardinal Systems, Inc.  Y2K READY', 'w');
    await B.type('Pentium(R) III CPU 600 MHz');
    await B.type('');
    if (!await B.memTest(65536, 4096, 25)) return;
    B.sfx.beep();
    await B.type('');
    await B.type('Primary Master   : 20.4 GB Ultra DMA');
    B.sfx.seek(6); if (!await B.wait(400)) return;
    await B.type('Secondary Master : CD-RW 8x4x32');
    B.sfx.cdrom(); if (!await B.wait(900)) return;
    await B.type('USB Controller   : found (nothing plugged in yet)');
    await B.type('System date      : 01/01/2000 ... OK. The world did not end.', 'w');
    if (!await B.wait(900)) return;
    await B.type('');
    await B.type('Starting Horizon 2000...');
    B.sfx.seek(10); if (!await B.wait(900)) return;
    B.splash();
    return B.wait(3600);
  },
  modem: {
    isp: 'PrairieNet', phone: '555-0100', appLabel: 'Internet Connection',
    options: [
      { v: 33600, label: '33.6K modem (the old one)', p: 'v34', lat: 0.7 },
      { v: 56000, eff: 49333, label: '56K modem', p: 'v90', lat: 0.55, note: '(56K modems almost never reached a full 56K.)' },
      { v: 768000, label: 'DSL, 768 Kbps (always on!)', kind: 'dsl', lat: 0.18 }
    ],
    def: 56000,
    dropMsg: 'Your mom picked up the phone to call Grandma, and it knocked you offline.\n\nWith DSL this wouldn\'t happen. Try it in Internet Connection!'
  },
  browser: {
    name: 'NetVoyager', style: 'icons', fwd: true, go: true, locLabel: 'Address', menu: 'Favorites', reload: 'Refresh', w: 740, h: 520,
    about: 'NetVoyager 5.0\nFaster, with Favorites, a Search button, and (sorry) pop-up windows.',
    offline: 'Connect first. With DSL you could just leave it on all day.',
    bookmarks: [['WebFinder', SITES.finder], ['PixelPets.com', SITES.kevin], ["Kevin's Weblog", SITES.blog], ['The Daily Byte', SITES.news], ['Download Depot', SITES.shack], ['BidBarn', SITES.bid]],
    links: [['WebFinder', SITES.finder], ['Daily Byte', SITES.news], ['Download Depot', SITES.shack], ['BidBarn', SITES.bid]]
  },
  sites: SITES,
  page,
  dlDone: 'Double-click it to install. Then click Next, Next, Next, I Agree, Next, Finish.',
  popups: [
    { title: 'CONGRATULATIONS!!!', html: '<big>YOU WON!!!</big><div>You are our 1,000,000th visitor!<br>Click below to claim your FREE prize!</div>', cta: 'Claim prize', after: 'There was no prize. There was never a prize.\n\nPop-up ads like this were everywhere in 2000, until browsers learned to block them.' },
    { title: 'Is your PC running SLOW?', html: '<big>SPEED UP YOUR PC!!</big><div>Your computer may be running at only 12% speed!</div>', cta: 'Fix it now', after: 'Nothing was wrong with your computer. Ads like this tried to trick people into installing junk.\n\nWhen in doubt, close the window.' },
    { title: 'Special offer', html: '<big>1,000 FREE HOURS!</big><div>Free Internet! Just install our CD!<br>(We will mail you 40 more.)</div>', cta: 'Sign me up', after: 'Free trial CDs showed up in mailboxes, cereal boxes and store counters. Lots of people used them as drink coasters.' }
  ],
  im: {
    id: 'im', label: 'Buddy Messenger', mode: 'im',
    offline: 'You\'re signed off. Connect to the Internet and your buddies will show up here.',
    bots: [
      { n: 'KevRocks22', c: '#0000c0', hello: ['hey {me}! did u see my dot-com? pixelpets.com', '{me}!!! long time. im a CEO now lol'], lines: ['we just hired our 40th employee. we have 0 customers lol', 'u want a PixelPets t-shirt? we have 5000', 'brb, meeting about our super bowl ad', 'Y2K was so boring. my VCR still blinks 12:00'],
        replies: [[/(pixel|pets|dot.?com|startup|company|ceo|money)/, ['its going GREAT. probably.', 'our stock went up 42% today!!', 'we have a foosball table in the office. thats basically a business plan']]] },
      { n: 'DanaBanana', c: '#008000', hello: ['hiiii {me}'], lines: ['did u download that song yet', 'my sister is on the phone so im at the library lol', 'omg my away message is SO good', 'i burned a mix CD, 18 songs!!'] },
      { n: 'xXSk8terXx', c: '#800080', hello: ['sup'], lines: ['a/s/l', 'wanna trade mp3s', 'my 56k connected at 44000 today. robbed', 'who has DSL. i am so jealous'] },
      { n: 'GrandmaJo', c: '#c05000', away: 'AT BINGO. BACK AT 4. LOVE GRANDMA (THIS IS GRANDMA)', hello: [], lines: [] }
    ],
    replies: [
      [/a\/?s\/?l/, ['22/m/nebraska lol', 'nice try', 'u sound like 1995']],
      [/y2k/, ['nothing happened lol', 'my dad bought 40 gallons of water for Y2K']],
      [/(mp3|song|music|cd|jukebox)/, ['my jukebox has like 300 songs', 'try the download depot', 'burn me a CD!!']],
      [/(dsl|cable|56k|modem|fast|slow|speed)/, ['i still have 56k :(', 'DSL is SO fast. pages load instantly', 'my modem makes that screech every time lol']],
      [/\b(hi|hello|hey|sup|yo)\b/, ['hey!', 'sup {me}', 'hiii']],
      [/\b(bye|gtg|g2g|brb|ttyl)\b/, ['ttyl!', 'bye {me}', 'later :)']],
      [/(lol|haha|rofl|lmao)/, ['lol', 'haha', 'LOL']],
      [/\?$/, ['hmm idk', 'good q', 'no clue lol']]
    ],
    generic: ['lol', 'haha', 'ya', ':)', 'omg', 'totally', 'k', 'nm u?', 'brb', 'cool cool']
  },
  songs: [
    { t: 'Dial Tone Disco', a: 'The Dial Tones', len: '3:42', song: SONG.disco },
    { t: 'Millennium Bug', a: 'Y2K & the Glitches', len: '4:05', song: SONG.bug },
    { t: 'Kyber Korner (2000 Remix)', a: 'DJ Kev', len: '5:11', song: SONG.kev },
    { t: 'Download Depot Mix', a: 'Unknown Artist', len: '3:30', song: SONG.depot, locked: 'SONG.MP3' }
  ],
  files: {
    'README.TXT':
`WELCOME TO 2000
===============

It's the new millennium. Y2K came and went, and nothing blew up. Use the Start button, the desktop pictures, or the little quick-launch buttons next to Start.

HOW BIG IS THIS COMPUTER?
- Memory: 64 MB. That's 16 times the 1990 computer.
- Hard drive: 20 GB. You could fit the whole 1990 hard drive on it 250 times.
- It has a CD burner. You can make your own mix CDs.

HOW DID PEOPLE GET ONLINE?
- Most homes still used a modem. A "56K" modem really connected at around 50,000 bits per second.
- That's twenty times faster than 1990. The screech was even longer, though.
- DSL and cable were brand new. They were always on, didn't use up the phone line, and were about 15 times faster than a modem.
- One song (about 3.5 MB) took about 10 minutes on a 56K modem. On DSL, under a minute.
- Instant messages, MP3s and pop-up ads were everywhere.

THINGS TO TRY
1. Open Internet Connection. Try the 56K modem first, then switch to DSL. Feel the difference.
2. Visit PixelPets.com. Kevin is 22 and runs a dot-com now.
3. Open Buddy Messenger and IM someone.
4. Download SONG.MP3 from the Download Depot, then play it in Jukebox.
5. Close the pop-up ads. There will be pop-up ads.
6. Click the hourglass on the taskbar to go back to 1990 and feel how slow it was.
7. Buy a game from the Software Store while you're online. On 56K it downloads slowly; on DSL it's done in seconds. Everything you bought in earlier years still works here.`,
    'JOKES.TXT':
`JOKES.TXT  (Download Depot, Millennium Edition)
----------------------------------------------

Q: Why did the computer stay calm on New Year's Eve?
A: It was Y2K-OK.

Q: Why did the dot-com hire a band?
A: It needed more "hits."

Q: How do you know a pop-up ad likes you?
A: It keeps coming back.

Q: Why did the MP3 break up with the CD?
A: It needed more space.

Q: What did the 56K modem say to DSL?
A: "Must be nice."

Q: Why was the instant message so fast?
A: It didn't wait for a stamp.

Q: What's a web page's favorite snack?
A: Cookies.

3 KB. On DSL, that downloaded before you finished reading this line.`
  }
};
})());
