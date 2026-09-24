/* 1990: Horizon 3.0, a Program Manager desktop, and a 2,400 bps modem. */
(window.RETRO_ERAS = window.RETRO_ERAS || []).push((() => {
const SITES = {
  home: 'http://www.prairienet.com/',
  finder: 'http://www.webfinder.com/',
  kevin: 'http://members.prairienet.com/~kevin/',
  guest: 'http://members.prairienet.com/~kevin/guestbook.html',
  news: 'http://www.dailybyte.com/',
  shack: 'http://www.shareware-shack.com/'
};
const GUESTS = [
  { n: 'Dana', w: 'Ohio', m: 'Cool page!! Check out mine too. Bye!!!' },
  { n: 'Webmaster Steve', w: 'Somewhere on the Net', m: 'Your background makes my eyes hurt. I love it.' },
  { n: 'Grandma Jo', w: 'Kansas', m: 'Kevin this is Grandma. I do not know how I got here. Call me.' }
];
const BANNER = `<svg class="img" data-kb="12" width="560" height="120" viewBox="0 0 140 30" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:560px"><rect width="140" height="8" fill="#4060e0"/><rect y="8" width="140" height="6" fill="#6a88f0"/><rect y="14" width="140" height="4" fill="#9fb4ff"/><rect x="104" y="6" width="10" height="2" fill="#ffd700"/><rect x="102" y="8" width="14" height="6" fill="#ffd700"/><rect x="104" y="14" width="10" height="2" fill="#ffd700"/><rect y="18" width="140" height="12" fill="#c8a040"/><g fill="#a07820">${Array.from({ length: 35 }, (_, i) => `<rect x="${i * 4}" y="${19 + (i % 3)}" width="1" height="${9 - (i % 3)}"/>`).join('')}</g><text x="8" y="14" font-size="11" font-weight="700" font-style="italic" fill="#fff" stroke="#000080" stroke-width=".6" font-family="Georgia,serif">PrairieNet Online</text></svg>`;
const KEVIN_SONG = { mel: [72, 76, 79, 76, 77, 81, 84, 81, 79, 76, 72, 76, 74, 71, 67, 71], bass: [48, 53, 55, 43], step: 0.19 };

function page(url, h) {
  const { A, esc } = h;
  const hits = h.store.get('hits', 4217);
  switch (url) {
    case SITES.home:
      h.store.set('hits', hits + 1);
      return { title: 'Welcome to PrairieNet Online', cls: '', blocks: [
        `<div>${BANNER}</div>`,
        `<h1>Welcome to PrairieNet!</h1><p>You are now connected to the <b>Information Superhighway</b>. From right here at your desk you can visit computers all over the world.</p>`,
        `<h2>What's New</h2><ul><li>${h.NEWGIF} ${A(SITES.kevin, "Kevin's Totally Rad Home Page")}, our member page of the week</li><li>${h.NEWGIF} ${A(SITES.news, 'The Daily Byte')} now updates every single week</li><li>Faster 9,600 bps lines in most area codes</li></ul>`,
        `<h2>Start Exploring</h2><ul><li>${A(SITES.finder, 'WebFinder')}: find anything on the Net (all of it)</li><li>${A(SITES.news, 'The Daily Byte')}: computer news you can use</li><li>${A(SITES.shack, 'Shareware Shack')}: free games and programs to download</li><li>${A('http://www.prairienet.com/weather/', 'Local weather')}</li><li>${A('http://www.prairie-state.edu/~bpatel/cool.html', 'Cool Links')}: a list of every cool page on the Web</li><li>${A('http://www.jokeoftheday.com/', 'Joke of the Day')} and ${A('http://www.prairienet.com/bbs/', 'the Prairie Area BBS list')}</li></ul>`,
        `<hr><p>${h.CONSTRUCTION}</p><p>This page is always under construction. Please check back soon!</p>`,
        `<p>You are visitor number <span class="counter">${String(hits + 1).padStart(6, '0')}</span></p><address>Questions? Email webmaster@prairienet.com. Please do not call, you are using the phone line.</address>`
      ]};
    case SITES.finder:
      return { title: 'WebFinder: Search the Web', cls: 'dir', blocks: [
        `<h1 style="color:#800000;font-style:italic">WebFinder</h1><p>Searching all <b>1,847</b> known pages on the World Wide Web.</p>`,
        `<form data-search><input type="text" name="q" size="28" aria-label="Search words"> <button class="btn" type="submit">Search</button></form>`,
        `<div data-results></div><h2>Browse by Category</h2><table><tr><td>${A('http://www.webfinder.com/arts/', 'Arts')} (41)</td><td>${A(SITES.shack, 'Computers')} (212)</td></tr><tr><td>${A('http://www.webfinder.com/edu/', 'Education')} (93)</td><td>${A(SITES.kevin, 'Personal Pages')} (608)</td></tr><tr><td>${A(SITES.news, 'News')} (17)</td><td>${A('http://www.webfinder.com/sci/', 'Science')} (126)</td></tr><tr><td>${A('http://www.webfinder.com/sports/', 'Sports')} (38)</td><td>${A('http://www.webfinder.com/fun/', 'Fun Stuff')} (371)</td></tr></table>`,
        `<hr><p><small>Can't find something? The Web is new. Try again next year when it's bigger.</small></p>`
      ], after(root) {
        const f = root.querySelector('[data-search]');
        f.onsubmit = e => {
          e.preventDefault();
          const q = f.q.value.trim(); if (!q) return;
          const slug = q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'nothing';
          const found = h.search(q).slice(0, 8);
          root.querySelector('[data-results]').innerHTML = `<h2>Results for "${esc(q)}"</h2><p>Found ${found.length + 3} matches in 4.2 seconds (very fast!)</p><ol>${found.map(e => `<li>${A(e.url, esc(e.title))}: ${esc(e.desc || '')}</li>`).join('')}<li>${A(SITES.kevin, "Kevin's Totally Rad Home Page")}: mentions "${esc(q)}" probably</li><li>${A(SITES.news, 'The Daily Byte')}</li><li>${A('http://www.' + slug + '.com/', 'www.' + esc(slug) + '.com')}</li></ol>`;
        };
      }};
    case SITES.kevin:
      return { title: "Kevin's Totally Rad Home Page!!!", cls: 'kev', music: KEVIN_SONG, blocks: [
        `<h1>~*~ Welcome 2 Kevin's Totally Rad Home Page ~*~</h1>`,
        `<div class="mq"><span style="color:#000;font-weight:700">*** Thanx for visiting!!! Sign my guestbook!!! This page has MUSIC!!! ***</span></div>`,
        `<div class="flame"></div><p class="center">Hi! I'm Kevin. I'm 12 and I made this whole page MYSELF using a text editor. It took all weekend.</p>`,
        `<h2 style="color:#ff0">My Favorite Things</h2><ul><li>Worm (high score: 4,210)</li><li>My dog Pixel</li><li>Pizza</li><li>Computers, obviously</li><li class="blinky" style="color:#f0f">Getting email!!!</li></ul>`,
        `<p class="center">${h.CONSTRUCTION}</p><p class="center">More stuff coming soon!!!</p>`,
        `<p class="center"><b>${A(SITES.guest, '>>> SIGN MY GUESTBOOK <<<')}</b></p><div class="flame"></div>`,
        `<p class="center">[ ${A('http://members.prairienet.com/~dana/', '&lt;&lt; Prev')} | Cool Kids Web Ring | ${A('http://members.prairienet.com/~marcus/', 'Next &gt;&gt;')} ]</p><p class="center">You are visitor <span class="counter">000${37 + h.gb.list(GUESTS).length}</span><br><small>Best viewed with NetVoyager at 640x480</small></p><p class="center"><button class="btn" data-stopmusic>Stop the music</button></p>`
      ], after(root) {
        const b = root.querySelector('[data-stopmusic]'); b.onclick = () => { h.stopMusic('web'); b.disabled = true; b.textContent = 'Music stopped'; };
      }};
    case SITES.guest:
      return { title: "Kevin's Guestbook", cls: 'kev', blocks: [
        `<h1>My Guestbook</h1><p class="center">Please sign it!!! ${A(SITES.kevin, 'Back to my home page')}</p>`,
        `<div data-entries>${h.gb.html(h.gb.list(GUESTS))}</div>`,
        `<h2 style="color:#0f0">Sign the Guestbook</h2>${h.gb.form()}`
      ], after(root, nv) { h.gb.bind(root, nv, SITES.guest, GUESTS); }};
    case SITES.news:
      return { title: 'The Daily Byte', cls: 'news', blocks: [
        `<div class="mast">The Daily Byte</div><p><i>Computer news for the whole family. Updated every Friday.</i></p>`,
        `<table><tr><td style="width:60%"><h2>Experts: One Day, Every Home Could Have Its Own Email Address</h2><p>A panel of computer scientists predicted this week that electronic mail may someday be as common as the telephone. "Maybe even Grandma will have one," said one researcher.</p></td><td><h2>New Modems Four Times as Fast</h2><p>This year's 9,600 bps modems can move a full page of text in about two seconds. "Nobody will ever need more," a shop owner told us.</p></td></tr></table>`,
        `<hr><h2>Is a Pocket Telephone in Your Future?</h2><p>Car phones are shrinking. Some engineers think a telephone could one day fit in a coat pocket. Critics say nobody would want to be reachable everywhere.</p>`,
        `<h2>Tip of the Week</h2><p>Always put the metal shutter back on your floppy disk before you put it in your backpack. Never leave disks near a magnet!</p><p>${A(SITES.home, 'Return to PrairieNet')}</p>`
      ]};
    case SITES.shack:
      return { title: 'Shareware Shack: Free Downloads', cls: '', blocks: [
        `<h1>Shareware Shack</h1><p>Try it free! If you like it, mail the author a check.</p>`,
        h.dlTable([['JOKES.TXT', 2, 'Four jokes, text only'], ['SKYBLAST.ZIP', 1200, 'Space shooting game'], ['CATPIC.GIF', 180, 'A photo of a cat'], ['SONG.MP3', 3000, 'One song. Yes, just one.']]),
        `<p><small>Tip: Start big downloads before bed. Don't let anyone use the phone!</small></p><p><b>Want the full versions?</b> ${h.APP('store', 'Order boxed games from the Cardinal Software Catalog')}: shipped on floppy disks!</p><p>${A(SITES.home, 'Back to PrairieNet')}</p>`
      ], after(root) { h.bindDownloads(root); }};
    default:
      return { title: '404 Not Found', cls: '', blocks: [
        `<h1>Not Found</h1><p>The requested URL <tt>${esc(url)}</tt> was not found on this server.</p><p>Maybe the person who made it moved it, or the computer in their closet is turned off.</p><hr><address>Server running on a 386 in somebody's basement</address>`
      ]};
  }
}

return {
  id: '1990', year: 1990,
  power: 'Turn it on to hear it boot up, dial into the internet over a phone line, and play the games people played. Turn your sound up.',
  speedBlurb: 'Modem: 2,400 bps',
  os: {
    name: 'Horizon', short: '3.0',
    about: 'Horizon Version 3.0\nA 1990 desktop, rebuilt for the web.\n\nMemory: 4,096 KB\nProcessor: 386DX, 33 MHz\nDisk: 80 MB\nModem: 2,400 bps\n\nYour phone is roughly a thousand times faster.',
    shutTitle: 'Exit Horizon', shutText: 'This will end your Horizon session.'
  },
  shell: 'progman',
  apps: ['dial', 'nv', 'readme', 'mines', 'worm', 'paint', 'np', 'cp'],
  sounds: { start: 'chime', bye: 'bye' },
  saver: 'stars', saverName: 'Starfield',
  walls: [['teal', '#008080', 'Teal'], ['midnight', '#000060', 'Midnight'], ['forest', '#205020', 'Forest'], ['plum', '#502050', 'Plum'], ['weave', '#008080', 'Weave pattern', 'repeating-conic-gradient(#006a6a 0 25%,#008080 0 50%) 0 0/8px 8px']],
  splash: `<div class="splash">
      <svg viewBox="0 0 48 30" shape-rendering="crispEdges" aria-hidden="true">
        <rect x="14" y="4" width="20" height="2" fill="#ff5500"/><rect x="11" y="6" width="26" height="2" fill="#ff7700"/>
        <rect x="9" y="8" width="30" height="2" fill="#ff9900"/><rect x="8" y="10" width="32" height="2" fill="#ffbb00"/>
        <rect x="7" y="12" width="34" height="2" fill="#ffdd00"/><rect x="6" y="14" width="36" height="2" fill="#ffee55"/>
        <rect x="0" y="17" width="48" height="2" fill="#000080"/><rect x="4" y="21" width="40" height="2" fill="#000080"/>
        <rect x="10" y="25" width="28" height="2" fill="#000080"/><rect x="18" y="28" width="12" height="2" fill="#000080"/>
      </svg>
      <p class="name">Horizon</p>
      <p class="ver">Version 3.0</p>
      <p class="copy">Copyright © 1985–1990 Horizon Software Corp. All rights reserved.</p>
    </div>`,
  async boot(B) {
    if (!await B.wait(700)) return;
    await B.type('Cardinal Systems BIOS v2.04  (C) 1989 Cardinal Systems, Inc.', 'w');
    await B.type('80386DX-33 Processor Detected');
    await B.type('');
    if (!await B.memTest(4096, 128)) return;
    B.sfx.beep();
    if (!await B.wait(500)) return;
    await B.type('');
    await B.type('Detecting Floppy Drive A: ... 1.44 MB 3.5"');
    B.sfx.floppy(); if (!await B.wait(2400)) return;
    await B.type('Detecting Hard Disk C:   ... 80 MB');
    B.sfx.seek(10); if (!await B.wait(900)) return;
    await B.type('');
    await B.type('Starting DOS...');
    B.sfx.seek(14); if (!await B.wait(1400)) return;
    await B.type('');
    await B.type('HIMEM is testing extended memory...done.');
    if (!await B.wait(500)) return;
    await B.type('');
    B.prompt('C:\\>');
    if (!await B.wait(700)) return;
    await B.type('win', 'w', 170); if (!B.live()) return;
    B.sfx.seek(8);
    if (!await B.wait(700)) return;
    B.clear('<span class="cur"></span>');
    B.sfx.seek(12);
    if (!await B.wait(1200)) return;
    B.splash();
    return B.wait(3200);
  },
  modem: {
    isp: 'PrairieNet Online', phone: '555-0142',
    options: [
      { v: 1200, label: '1,200 bps (hand-me-down modem)', p: 'v22', lat: 1.2 },
      { v: 2400, label: '2,400 bps (the usual)', p: 'v22', lat: 1 },
      { v: 9600, label: '9,600 bps (brand new, top of the line!)', p: 'v32', lat: 0.9 }
    ],
    def: 2400,
    dropMsg: 'Someone in your house picked up the phone to make a call, and it knocked you offline.\n\nThis happened ALL the time.'
  },
  browser: {
    name: 'NetVoyager', style: 'text',
    about: 'NetVoyager 1.0\nYour window to the World Wide Web.\n\nRequires a modem and a phone line nobody else is using.',
    offline: 'In 1990 you had to dial in first, every single time.',
    bookmarks: [['WebFinder', SITES.finder], ["Kevin's Page", SITES.kevin], ['The Daily Byte', SITES.news], ['Shareware Shack', SITES.shack]]
  },
  sites: SITES,
  page,
  dlDone: "Next you'd unzip it, install it from a DOS prompt, and hope it fit on your hard drive.",
  files: {
    'README.TXT':
`WELCOME TO 1990
===============

You're sitting at a home computer from around 1990. Double-click a picture in Program Manager to open it. (Mouse users double-click. Touchscreens didn't exist yet, but here you can tap.)

HOW BIG IS THIS COMPUTER?
- Memory: 4 MB. A new phone has about 2,000 times more.
- Hard drive: 80 MB. That's about 20 songs today.
- A floppy disk held 1.44 MB. You saved your homework on one and carried it to school.

HOW DID PEOPLE GET ONLINE?
- The computer used a MODEM to call another computer over the family's home phone line.
- That screeching sound is two modems figuring out how fast they can talk to each other.
- Most modems ran at 2,400 bits per second. A 9,600 bps modem was fancy and expensive.
- While you were online, nobody else could use the phone. If someone picked up to make a call, you got kicked off.
- Pages loaded a line at a time. Pictures appeared slowly from top to bottom.
- One song (about 3 MB) took more than three hours to download at 2,400 bps.

A LITTLE HONESTY
In 1990 the World Wide Web had only just been invented. Most families got online through services and bulletin boards, and web browsers showed up a few years later. This computer cheats a little and lets you try both at once.

THINGS TO TRY
1. Open Dial-Up Connection and press Connect.
2. When it connects, explore NetVoyager.
3. Sign the guestbook on Kevin's home page.
4. Try downloading something. Watch the clock.
5. Beat Mines. Get a big score in Worm.
6. Leave the computer alone for a minute...
7. Click the hourglass on the taskbar to jump ahead to 1995 or 2000. Watch how much faster the internet gets.
8. Open the Software Store. You start with $60 of birthday money, get a $10 allowance each day you visit, and earn more by winning the free games. Boxed games from 1990 arrive on floppy disks, and they keep working when you travel forward in time.`,
    'JOKES.TXT':
`JOKES.TXT  (downloaded from Shareware Shack)
-------------------------------------------

Q: Why did the computer go to the doctor?
A: It had a virus.

Q: What's a computer's favorite snack?
A: Microchips.

Q: Why was the modem so tired?
A: It spent all night handshaking.

Q: How do you know a floppy disk is scared?
A: It's always backing up.

That's all. It took 2 KB, which is why there are only four.`
  }
};
})());
