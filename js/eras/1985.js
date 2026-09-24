/* 1985: Horizon DOS. No mouse, no windows: a blinking C:\> prompt, 640K of memory and a 1,200 bps modem
   for calling bulletin boards. Kids get a clickable Program Menu and a Time Machine button on the bottom bar. */
(window.RETRO_ERAS = window.RETRO_ERAS || []).push({
  id: '1985', year: 1985,
  power: 'Five years before the others. No mouse and no pictures: just a blinking prompt waiting for you to type. Programs load from floppy disks, and the modem crawls along at 1,200 bps. Don\'t like typing? Tap PROGRAMS on the bottom bar.',
  speedBlurb: 'Modem: 1,200 bps',
  os: {
    name: 'Horizon DOS', short: '2.1',
    about: 'Horizon DOS Version 2.11\n\nMemory: 640 KB ("should be enough for anybody," people joked)\nProcessor: 8088, 4.77 MHz\nDisk: 10 MB hard disk, plus a 5¼" floppy drive holding 360 KB\nModem: 1,200 bps\n\nYour phone is roughly a hundred thousand times faster.',
    shutTitle: 'Turn off', shutText: 'Turn off the computer?'
  },
  shell: 'dos',
  apps: ['readme', 'cp'],
  sounds: { start: 'beep', bye: 'beep' },
  saver: 'stars', saverName: 'Starfield',
  // In 1985 the "desktop color" is the monitor's phosphor.
  walls: [['green', '#33ff66', 'Green screen'], ['amber', '#ffb000', 'Amber screen'], ['white', '#d8d8d8', 'White screen']],
  splash: '',
  async boot(B) {
    if (!await B.wait(900)) return;
    await B.type('Cardinal PC/XT BIOS v1.02  (C) 1984 Cardinal Systems, Inc.', 'w');
    await B.type('8088 CPU at 4.77 MHz');
    await B.type('');
    if (!await B.memTest(640, 16, 45)) return;
    B.sfx.beep();
    if (!await B.wait(600)) return;
    await B.type('');
    await B.type('Loading Horizon DOS from drive A: ...');
    B.sfx.floppy(); if (!await B.wait(2600)) return;
    B.sfx.seek(10); if (!await B.wait(700)) return;
    B.clear();
    await B.type('Horizon DOS Version 2.11', 'w');
    await B.type('(C) Copyright Horizon Software Corp 1981, 1985');
    await B.type('');
    const d = new Date(), days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dt = new Date(1985, d.getMonth(), d.getDate());
    await B.type(`Current date is ${days[dt.getDay()]} ${dt.getMonth() + 1}-${dt.getDate()}-1985`);
    B.prompt('Enter new date (mm-dd-yy): ');
    if (!await B.wait(500)) return;
    await B.type('', null, 0);
    await B.type(`Current time is ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false })}.00`);
    B.prompt('Enter new time: ');
    if (!await B.wait(500)) return;
    await B.type('', null, 0);
    return B.wait(400);
  },
  modem: {
    isp: 'Prairie BBS', phone: '555-1985',
    options: [
      { v: 300, label: '300 bps (acoustic coupler)', p: 'v22', lat: 1.4 },
      { v: 1200, label: '1,200 bps (Hayes-style modem)', p: 'v22', lat: 1.2 }
    ],
    def: 1200,
    dropMsg: 'Somebody picked up the phone in the kitchen and you got disconnected. Back then, that ended your call.'
  },
  browser: { name: 'No browser', style: 'text', about: 'The World Wide Web won\'t be invented for a few more years.', offline: 'There is no Web yet.', bookmarks: [] },
  sites: { home: '', finder: '' },
  page: (url, h) => ({ title: 'Not yet', cls: '', blocks: [`<h1>Not invented yet</h1><p>The Web arrives around 1991. In 1985 people called bulletin boards instead.</p>`] }),
  dlDone: 'It\'s saved on your hard disk. Run it by typing its name at the C:\\> prompt.',
  files: {
    'README.TXT':
`WELCOME TO 1985
===============

This computer has no mouse and no pictures. It shows a prompt:

    C:\\>

and waits for you to TYPE a command, then press Enter.

TRY THESE COMMANDS
  DIR        list the files on the disk
  CD GAMES   go into the GAMES folder   (CD \\ goes back)
  TYPE README.TXT   show a text file
  CLS        clear the screen
  HELP       list every command
  MENU       a menu you can use with arrow keys (or tap PROGRAMS)
  1990       jump to the 1990 computer (also 1995 and 2000)

DON'T LIKE TYPING?
Tap PROGRAMS on the bottom bar for a menu, or TIME MACHINE to go to
another year. Nobody will mind.

HOW BIG IS THIS COMPUTER?
- Memory: 640 KB. A new phone has about 12,000 times more.
- Hard disk: 10 MB, which was huge. Lots of people only had floppies.
- A 5 1/4" floppy disk held 360 KB. It really was floppy.

HOW DID PEOPLE GET ONLINE?
There was no World Wide Web yet. People used a modem to call a
BULLETIN BOARD SYSTEM (a BBS): someone's computer, often in their
bedroom, with one phone line. Only one person could call at a time.
At 1,200 bps you can watch the text appear letter by letter.`
  }
});
