/* 1995: Horizon 95, a Start button, a 28.8K modem, the Web taking off, and chat rooms. */
(window.RETRO_ERAS = window.RETRO_ERAS || []).push((() => {
const SITES = {
  home: 'http://www.prairienet.com/',
  finder: 'http://www.webfinder.com/',
  kevin: 'http://www.cyberburbs.com/siliconhills/4077/',
  guest: 'http://www.cyberburbs.com/siliconhills/4077/guestbook.html',
  news: 'http://www.dailybyte.com/',
  shack: 'http://www.shareware-shack.com/',
  fish: 'http://www.prairienet.com/cool/fishcam.html'
};
const GUESTS = [
  { n: 'Dana', w: 'Ohio', m: 'Kevin ur page is SO much better than in 1990. The frames are awesome.' },
  { n: 'DoomDude', w: 'Texas', m: 'Nice band page. Put up an MP3!!! (what is an MP3)' },
  { n: 'Grandma Jo', w: 'Kansas', m: 'Kevin, I found you again. I have my own email address now. Your cousin set it up. Love, Grandma' }
];
const BANNER = `<svg class="img" data-kb="18" width="560" height="90" viewBox="0 0 140 22" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:560px"><defs><linearGradient id="b95" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000066"/><stop offset="1" stop-color="#3366cc"/></linearGradient></defs><rect width="140" height="22" fill="url(#b95)"/><circle cx="122" cy="11" r="7" fill="#ffcc00"/><path d="M0 18 Q35 12 70 18 T140 18 V22 H0Z" fill="#339933"/><text x="6" y="12" font-size="9" font-weight="700" fill="#ffcc00" font-family="Arial">PrairieNet</text><text x="6" y="18" font-size="4.5" fill="#fff" font-family="Arial">Your on-ramp to the World Wide Web</text></svg>`;
const FISHTANK = `<svg class="img" data-kb="40" width="320" height="200" viewBox="0 0 80 50" shape-rendering="crispEdges" style="max-width:100%"><rect width="80" height="50" fill="#1a5fa0"/><rect y="42" width="80" height="8" fill="#c8a860"/><g fill="#2a8"><rect x="8" y="26" width="2" height="16"/><rect x="11" y="30" width="2" height="12"/><rect x="66" y="22" width="2" height="20"/><rect x="63" y="28" width="2" height="14"/></g><g fill="#f80"><rect x="30" y="18" width="10" height="5"/><rect x="40" y="16" width="3" height="9"/><rect x="31" y="19" width="1" height="1" fill="#000"/></g><g fill="#ff0"><rect x="50" y="32" width="7" height="4"/><rect x="57" y="31" width="2" height="6"/></g><g fill="#9cf"><rect x="28" y="12" width="1" height="1"/><rect x="27" y="8" width="1" height="1"/><rect x="29" y="4" width="1" height="1"/></g><text x="2" y="6" font-size="3.5" fill="#fff" font-family="monospace">FISHCAM 10:42:07</text></svg>`;
const EMAILGIF = `<svg class="blinky" width="42" height="28" viewBox="0 0 21 14" style="vertical-align:middle"><rect width="21" height="14" fill="#fff" stroke="#000"/><path d="M0 0l10.5 8L21 0" fill="none" stroke="#000"/></svg>`;
const KEVIN_SONG = { mel: [67, 0, 67, 69, 71, 0, 74, 0, 72, 71, 69, 0, 67, 69, 71, 67], bass: [43, 48, 50, 43], step: 0.17, lead: 'triangle', leadVol: 0.06, harm: 7 };

function page(url, h) {
  const { A, APP, esc } = h;
  const hits = h.store.get('hits', 118204);
  switch (url) {
    case SITES.home:
      h.store.set('hits', hits + 1);
      return { title: 'PrairieNet Online: Welcome to the Web!', cls: 'w95', blocks: [
        `<div>${BANNER}</div>`,
        `<table class="portal" width="100%"><tr><td class="side" style="width:150px"><b>Channels</b><br>${A(SITES.news, 'News')}<br>${APP('chat', 'Chat Rooms')}<br>${A(SITES.shack, 'Downloads')}<br>${A(SITES.finder, 'Search')}<br>${A(SITES.fish, 'Cool Site of the Day')}<br>${A('http://www.prairienet.com/kids/', 'Kids Only')}<br>${A('http://www.prairienet.com/weather/', 'Weather')}</td><td>
          <h1 style="color:#000066;font-family:Arial">Welcome to the World Wide Web!</h1><p>Millions of people are getting online this year. Now you're one of them. Welcome aboard!</p>
          <h2>${h.NEWGIF} Chat LIVE with people all over the world</h2><p>Type a message and someone in another state reads it <i>instantly</i>. ${APP('chat', 'Enter the Teen Lounge chat room')}</p></td></tr></table>`,
        `<div class="cool"><b>Cool Site of the Day:</b> ${A(SITES.fish, 'The PrairieNet FishCam')}. A real camera, pointed at a real fish tank, updated every five minutes. Truly, the future is here.</div>`,
        `<h2>Member Pages</h2><ul><li>${A(SITES.kevin, "Kevin's Kool Kyber Korner")} (Kevin's back, and he learned tables!)</li><li>${A('http://www.cyberburbs.com/hollywood/2112/', "Dana's Unexplained Files Fan Page")}</li><li>${A('http://www.cyberburbs.com/petsburgh/2222/', 'The Gerbil Jamboree')} (warning: catchy)</li></ul><p>Get your own <b>free home page</b> on ${A('http://www.cyberburbs.com/', 'CyberBurbs')}. 2 MB of space! That's more than a whole floppy disk. ${APP('pagebuilder', 'Build one now')}</p>`,
        `<h2>This Week</h2><ul><li>${A(SITES.news, 'The Daily Byte')}: Horizon 95 is here, and people waited in line at midnight</li><li>New 28,800 bps access numbers in 40 cities</li><li>${A(SITES.shack, 'Shareware Shack')}: now with pictures in JPEG!</li><li>${A('http://www.infosphere-online.com/', 'InfoSphere')}: an encyclopedia on the Web (A to C so far)</li><li>${A('http://www.shoptron95.com/', 'ShopTron')}: shop online without leaving your chair</li></ul>`,
        `<hr><p style="text-align:center">You are visitor number <span class="counter">${String(hits + 1).padStart(7, '0')}</span><br><small>© 1995 PrairieNet Online. Best viewed with NetVoyager 2.0. ${h.CONSTRUCTION.replace('width="220" height="64"', 'width="110" height="32"')}</small></p>`
      ]};
    case SITES.finder:
      return { title: 'WebFinder: Search 10 Million Pages', cls: 'w95 dir', blocks: [
        `<h1 style="color:#800000;font:italic 700 36px Georgia,serif;text-align:center;margin:.4em 0 0">WebFinder</h1><p style="text-align:center">Now searching over <b>10,000,000</b> pages! The Web has gotten a <i>little</i> bigger.</p>`,
        `<form data-search style="text-align:center"><input type="text" name="q" size="32" aria-label="Search words"> <button class="btn" type="submit">Search</button></form>`,
        `<div data-results></div><h2>Browse the Web</h2><table><tr><td>${A('http://www.webfinder.com/arts/', 'Arts &amp; Humanities')} (2,210)</td><td>${A(SITES.shack, 'Computers &amp; Internet')} (18,404)</td></tr><tr><td>${A('http://www.webfinder.com/edu/', 'Education')} (6,930)</td><td>${A(SITES.kevin, 'Personal Home Pages')} (91,208)</td></tr><tr><td>${A(SITES.news, 'News &amp; Media')} (1,730)</td><td>${A(SITES.fish, 'Cool Links')} (4,771)</td></tr><tr><td>${A('http://www.webfinder.com/sports/', 'Sports')} (3,815)</td><td>${A('http://www.webfinder.com/tv/', 'Television')} (5,020)</td></tr></table>`
      ], after(root) {
        const f = root.querySelector('[data-search]');
        f.onsubmit = e => {
          e.preventDefault();
          const q = f.q.value.trim(); if (!q) return;
          const slug = q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'nothing';
          const found = h.search(q).slice(0, 8);
          root.querySelector('[data-results]').innerHTML = `<h2>Results for "${esc(q)}"</h2><p>Found ${(2408 + found.length).toLocaleString()} matches in 1.6 seconds. Showing 1–${found.length + 4}.</p><ol>${found.map(e => `<li>${A(e.url, esc(e.title))}: ${esc(e.desc || '')}</li>`).join('')}<li>${A('http://www.' + slug + '.com/', esc(q) + ' Home Page')}: The OFFICIAL page for ${esc(q)}!!!</li><li>${A(SITES.kevin, "Kevin's Kool Kyber Korner")}: Kevin likes ${esc(q)} too, probably</li><li>${A('http://www.cyberburbs.com/area51/1999/', esc(q) + ' fan club (under construction)')}</li><li>${A(SITES.news, 'The Daily Byte')}: "Is ' + esc(q) + ' the next big thing?"</li></ol>`;
        };
      }};
    case SITES.kevin:
      return { title: "Kevin's Kool Kyber Korner", cls: 'kev95', music: KEVIN_SONG, blocks: [
        `<h1>&gt;&gt;&gt; Kevin's Kool Kyber Korner &lt;&lt;&lt;</h1><div class="mq" style="background:#0f0"><span style="color:#000;font-weight:700">*** NOW WITH TABLES *** Email me!!! *** My band The Dial Tones is playing the school dance Friday ***</span></div>`,
        `<div class="frame"><p class="center">Hey, it's Kevin! I'm 17 now. Remember my old page from 1990? It was SO bad. This one has a black background, which is way more professional.</p><p class="center">${EMAILGIF} Email me: kevin@prairienet.com ${EMAILGIF}</p></div>`,
        `<table width="100%"><tr><td width="50%" class="frame"><h2 style="color:#ff0">About Me</h2><ul><li>Senior at Prairie High</li><li>Guitar in The Dial Tones</li><li>Pixel (my dog) is 7 now</li><li>Worm high score: 12,880</li></ul></td><td class="frame"><h2 style="color:#ff0">Kool Links</h2><ul><li>${A(SITES.fish, 'The FishCam!!!')}</li><li>${A(SITES.shack, 'Shareware Shack')}</li><li>${A('http://www.cyberburbs.com/hollywood/2112/', "Dana's Unexplained Files page")}</li><li>${APP('chat', 'Come find me in the Teen Lounge')}</li></ul></td></tr></table>`,
        `<p class="center">${h.CONSTRUCTION}</p><p class="center"><b>${A(SITES.guest, '*** SIGN MY GUESTBOOK ***')}</b></p>`,
        `<div class="ring">This site is a member of the <b>Garage Band Web Ring</b><br>[ ${A('http://www.cyberburbs.com/sunsetstrip/1234/', 'Prev')} | ${A('http://www.cyberburbs.com/sunsetstrip/5678/', 'Random')} | ${A('http://www.cyberburbs.com/sunsetstrip/9012/', 'Next')} ]</div>`,
        `<p class="center">You are visitor <span class="counter">00${1400 + h.gb.list(GUESTS).length}</span><br><small>Best viewed with NetVoyager 2.0 at 800x600 in 256 colors</small></p><p class="center"><button class="btn" data-stopmusic>Stop the MIDI</button></p>`
      ], after(root) {
        const b = root.querySelector('[data-stopmusic]'); b.onclick = () => { h.stopMusic('web'); b.disabled = true; b.textContent = 'MIDI stopped'; };
      }};
    case SITES.guest:
      return { title: "Kevin's Guestbook", cls: 'kev95', blocks: [
        `<h1>Sign My Guestbook!</h1><p class="center">${A(SITES.kevin, 'Back to the Kyber Korner')}</p>`,
        `<div data-entries>${h.gb.html(h.gb.list(GUESTS))}</div>`,
        `<h2 style="color:#ff0">Sign It</h2>${h.gb.form()}`
      ], after(root, nv) { h.gb.bind(root, nv, SITES.guest, GUESTS); }};
    case SITES.news:
      return { title: 'The Daily Byte', cls: 'news', blocks: [
        `<div class="mast">The Daily Byte <small style="font-size:14px;font-weight:400">now on the World Wide Web!</small></div><p><i>Computer news for the whole family. Updated daily (well, most days).</i></p>`,
        `<table><tr><td style="width:60%"><h2>Horizon 95 Arrives; Shoppers Line Up at Midnight</h2><p>Computer stores stayed open late as customers waited to buy the new Horizon 95. Its new <b>Start button</b> puts all your programs in one place. "I don't even have a computer," said one man in line. "I just wanted to be here."</p></td><td><h2>Modems Hit 28,800</h2><p>The newest modems are twelve times faster than the 2,400 bps models from 1990. A picture that took two minutes now takes ten seconds.</p></td></tr></table>`,
        `<hr><h2>Would You Buy Something on the Web?</h2><p>A handful of online stores now let you order books and CDs from your computer. Experts warn: never type your credit card number unless you see the little lock picture.</p>`,
        `<h2>Tip of the Week</h2><p>In chat rooms, never give out your real name, address, or phone number. And if someone asks "a/s/l?", that means age, sex and location. You don't have to answer.</p><p>${A(SITES.home, 'Return to PrairieNet')}</p>`
      ]};
    case SITES.shack:
      return { title: 'Shareware Shack: Free Downloads', cls: 'w95', blocks: [
        `<h1 style="font-family:Arial;color:#000066">Shareware Shack</h1><p>Over 4,000 programs! Try them free. If you like one, mail the author a check.</p>`,
        h.dlTable([['JOKES.TXT', 3, 'Six brand-new jokes'], ['CATPIC.JPG', 60, 'A photo of a cat. JPEG makes it smaller!'], ['SKYBLAST2.ZIP', 2400, 'Space shooter, now in 256 colors'], ['SONG.MP3', 3000, 'One song, in the new MP3 format'], ['CLIP.AVI', 5200, 'A 30-second video the size of a postage stamp']]),
        `<p><small>Big downloads? Ask your parents about a second phone line.</small></p><p><b>New on CD-ROM:</b> ${APP('store', 'Visit the CompuMart CD-ROM Superstore')}</p><p>${A(SITES.home, 'Back to PrairieNet')}</p>`
      ], after(root) { h.bindDownloads(root); }};
    case SITES.fish:
      return { title: 'The PrairieNet FishCam', cls: 'w95', blocks: [
        `<h1 style="font-family:Arial;text-align:center">The PrairieNet FishCam</h1><p style="text-align:center">A LIVE picture from the fish tank in our office, updated every 5 minutes!</p>`,
        `<p style="text-align:center">${FISHTANK}</p>`,
        `<p style="text-align:center">That's Goldie (orange) and Mr. Bubbles (yellow). Click Reload to see if they moved.</p><p style="text-align:center"><small>This picture is 40 KB, so it takes a while. Worth it.</small></p><p style="text-align:center">${A(SITES.home, 'Back to PrairieNet')}</p>`
      ]};
    default:
      return { title: '404 Not Found', cls: 'w95', blocks: [
        `<h1>404 Not Found</h1><p>The requested URL <tt>${esc(url)}</tt> was not found on this server.</p><p>The page may have moved, or maybe it's still under construction. Most of the Web was.</p><hr><address>WebServer/1.0 on a Pentium in a closet</address>`
      ]};
  }
}

return {
  id: '1995', year: 1995,
  power: 'Five years later. There\'s a Start button now, a CD-ROM drive, and a modem twelve times faster. The Web is taking off, and everybody wants to be in a chat room.',
  speedBlurb: 'Modem: 28,800 bps',
  os: {
    name: 'Horizon 95', short: '',
    about: 'Horizon 95\nThe desktop with a Start button.\n\nMemory: 8 MB\nProcessor: Pentium, 75 MHz\nDisk: 850 MB\nCD-ROM: 4x speed\nModem: 28,800 bps\n\nThat modem is 12 times faster than the one from 1990.',
    shutTitle: 'Shut Down Horizon', shutText: 'Are you sure you want to shut down the computer?',
    startSide: '<b>Horizon</b>95'
  },
  shell: 'start',
  apps: ['dial', 'nv', 'chat', 'readme', 'mines', 'worm', 'paint', 'np', 'cp'],
  sounds: { start: 'chime95', bye: 'bye95' },
  saver: 'mystify', saverName: 'Mystery Lines',
  walls: [['teal', '#008080', 'Teal'], ['clouds', 'linear-gradient(#3a7bd5,#8ec5fc)', 'Clouds'], ['midnight', '#000060', 'Midnight'], ['forest', '#205020', 'Forest'], ['plum', '#502050', 'Plum']],
  splash: `<div class="splash95">
      <i class="cl" style="left:8%;top:14%;width:180px;height:60px"></i><i class="cl" style="left:62%;top:9%;width:240px;height:70px"></i>
      <i class="cl" style="left:24%;top:70%;width:220px;height:64px"></i><i class="cl" style="left:74%;top:62%;width:160px;height:50px"></i>
      <div class="mid">
        <svg viewBox="0 0 48 30" shape-rendering="crispEdges" aria-hidden="true">
          <rect x="14" y="4" width="20" height="2" fill="#ff5500"/><rect x="11" y="6" width="26" height="2" fill="#ff7700"/>
          <rect x="9" y="8" width="30" height="2" fill="#ff9900"/><rect x="8" y="10" width="32" height="2" fill="#ffbb00"/>
          <rect x="7" y="12" width="34" height="2" fill="#ffdd00"/><rect x="6" y="14" width="36" height="2" fill="#ffee55"/>
          <rect x="0" y="17" width="48" height="2" fill="#000080"/><rect x="4" y="21" width="40" height="2" fill="#000080"/>
          <rect x="10" y="25" width="28" height="2" fill="#000080"/><rect x="18" y="28" width="12" height="2" fill="#000080"/>
        </svg>
        <p class="name">Horizon<sup>95</sup></p>
      </div>
      <div class="bar"></div>
    </div>`,
  async boot(B) {
    if (!await B.wait(500)) return;
    await B.type('Cardinal BIOS v4.51PG  (C) 1994 Cardinal Systems, Inc.', 'w');
    await B.type('Pentium(R) CPU at 75 MHz');
    await B.type('');
    if (!await B.memTest(8192, 512, 30)) return;
    B.sfx.beep();
    if (!await B.wait(400)) return;
    await B.type('');
    await B.type('Detecting IDE Primary Master   ... 850 MB');
    B.sfx.seek(8); if (!await B.wait(800)) return;
    await B.type('Detecting IDE Secondary Master ... CD-ROM 4X');
    B.sfx.cdrom(); if (!await B.wait(1700)) return;
    await B.type('Plug and Play init completed');
    if (!await B.wait(500)) return;
    await B.type('');
    await B.type('Starting Horizon 95...', 'w');
    B.sfx.seek(14); if (!await B.wait(1500)) return;
    B.splash();
    return B.wait(4200);
  },
  modem: {
    isp: 'PrairieNet Online', phone: '555-0195',
    options: [
      { v: 14400, label: "14,400 bps (last year's modem)", p: 'v32', lat: 0.85 },
      { v: 28800, label: '28,800 bps (brand new!)', p: 'v34', lat: 0.75 }
    ],
    def: 28800,
    dropMsg: 'Your little brother picked up the phone to call a friend, and it knocked you offline.\n\nIn 1995, lots of families got a second phone line just for the computer.'
  },
  browser: {
    name: 'NetVoyager', style: 'icons', fwd: true, menu: 'Bookmarks', w: 680, h: 490,
    about: 'NetVoyager 2.0\nNow with pictures, tables and background music!\n\nStill needs a phone line nobody else is using.',
    offline: 'Dial in first. (And hurry up, someone might need the phone.)',
    bookmarks: [['WebFinder', SITES.finder], ["Kevin's Kyber Korner", SITES.kevin], ['The Daily Byte', SITES.news], ['Shareware Shack', SITES.shack], ['FishCam', SITES.fish]]
  },
  sites: SITES,
  page,
  dlDone: 'Double-click it in My Computer, and Horizon 95 will try to figure out what to do with it.',
  chat: {
    id: 'chat', label: 'Chat Room', mode: 'room', room: 'the Teen Lounge',
    offline: 'You need to be connected to PrairieNet to chat. Open Dial-Up Connection first.',
    bots: [
      { n: 'SkaterGrl95', c: '#c00000', hello: ['hi {me}!!', 'hey new person :)'], lines: ['anyone here like grunge?', 'my mom says 10 more minutes on the phone', 'lol', 'brb getting a snack', 'the start button is so cool', 'who else is watching the X-Files tonight'] },
      { n: 'DoomDude', c: '#006000', hello: ['sup {me}'], lines: ['just beat level 3!!!', 'my modem is 28.8 now. SO FAST', 'anyone want to trade shareware?', 'ROFL', 'my dad got a CD-ROM with an entire encyclopedia on it'] },
      { n: 'CyberKev', c: '#0000c0', hello: ['{me}! did u sign my guestbook yet?'], lines: ['check out my new home page, its on CyberBurbs', 'my band The Dial Tones is playing friday', 'i learned tables in HTML. i am unstoppable', 'my old page from 1990 was so embarrassing lol'] },
      { n: 'MomOf3', c: '#800080', hello: ['Hello {me}, welcome!'], lines: ['How do I make the letters bigger?', 'Is this the recipe room?', 'My son set this up for me.', 'WHY IS EVERYTHING IN CAPITALS', 'Does anyone know how to turn off the caps lock'] }
    ],
    replies: [
      [/a\/?s\/?l/, ['17/m/nebraska', '15/f/ohio', 'nice try. my teacher said never give that out']],
      [/\b(hi|hello|hey|sup|yo)\b/, ['hiya!', 'hey {me}', 'welcome to the lounge!']],
      [/\b(bye|gtg|g2g|brb)\b/, ['bye!!', 'cya {me}', 'later!']],
      [/(lol|haha|rofl)/, ['lol', 'ROFL', ':-)']],
      [/(game|doom|worm|mines)/, ['i got 3000 in worm', 'mines is impossible', 'games rule']],
      [/(music|band|song|cd)/, ['grunge forever', 'i have 40 CDs', 'The Dial Tones rule']],
      [/(school|homework|teacher)/, ['ugh homework', 'i did my report ON the internet about the internet']],
      [/(computer|pentium|modem|28\.8|fast)/, ['my dad got a pentium!!', '28.8 baby', 'my cousin has a 14.4 lol']],
      [/\?$/, ['good question', 'idk', 'hmm no clue']]
    ],
    generic: [':-)', 'cool', 'lol', 'no way!', 'totally', 'same', 'what?', 'k', 'thats awesome']
  },
  files: {
    'README.TXT':
`WELCOME TO 1995
===============

Five years later. Click the Start button in the corner to find your programs, or double-click the pictures on the desktop.

HOW BIG IS THIS COMPUTER?
- Memory: 8 MB (twice as much as 1990).
- Hard drive: 850 MB. Ten times bigger. You'll never fill it up. (You will.)
- It has a CD-ROM drive. One CD holds about 650 MB, as much as 450 floppy disks.

HOW DID PEOPLE GET ONLINE?
- Still a modem, still the family phone line. But now it's 28,800 bits per second, twelve times faster than 1990.
- The World Wide Web is exploding. Millions of people got online this year.
- Everyone wanted their own home page, usually with a black background and a counter.
- Chat rooms were huge. You typed, and someone in another state read it right away.
- One song (about 3 MB) still took about 15 minutes to download.

THINGS TO TRY
1. Open Dial-Up Connection and press Connect. Listen for the longer handshake.
2. Visit Kevin's new home page. He's 17 now.
3. Look at the FishCam. Yes, really.
4. Open Chat Room and say hi. Try typing "a/s/l".
5. Download something and compare the time to 1990.
6. Click the hourglass on the taskbar to jump back to 1990 or ahead to 2000.
7. Look in Start, then Games, for the new card games. Then visit the CompuMart CD-ROM Superstore (the Software Store icon) and buy something with the money you've earned.`,
    'JOKES.TXT':
`JOKES.TXT  (downloaded from Shareware Shack, 1995 edition)
---------------------------------------------------------

Q: Why did the Web page go to school?
A: To get more links.

Q: What's a computer's favorite kind of music?
A: Disk-o.

Q: Why was the chat room so hot?
A: Too many fans.

Q: How many people does it take to change a light bulb in a chat room?
A: a/s/l?

Q: Why did the mouse leave the party early?
A: It was double-clicked.

Q: What's the fastest thing on the Internet?
A: Your mom yelling that she needs the phone.

These six jokes took 3 KB. We're moving up in the world.`
  }
};
})());
