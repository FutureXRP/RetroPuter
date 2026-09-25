/* Horizon Mail (1995) / Inbox (2000): a pretend e-mail program.
   Nothing ever leaves this computer: every message, contact and reply lives in api.save.
   Work Center jobs that carry a `mail` object arrive here as e-mail; replying reports api.task('mail-send'). */
(function () {
  const screenEra = () => { const s = document.getElementById('screen'); const m = s && s.className.match(/era-(\d{4})/); return m ? m[1] : '1995'; };
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOUR = 36e5, DAY = 864e5;
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const stripRe = s => String(s || '').replace(/^((re|fw|fwd)\s*:\s*)+/i, '').replace(/\s*\(automatic reply\)$/i, '');
  const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+/i;

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="8" width="26" height="18" fill="#fff" stroke="#000"/><path d="M4 9l12 9 12-9" fill="none" stroke="#000"/><path d="M4 25l9-8M28 25l-9-8" fill="none" stroke="#808080"/><rect x="22" y="3" width="8" height="8" fill="#e00000" stroke="#000"/><rect x="25" y="5" width="2" height="4" fill="#fff"/></svg>';
  const I = {
    new: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="1" width="9" height="13" fill="#fff" stroke="#000"/><path d="M4 4h5M4 6h5M4 8h3" stroke="#000"/><path d="M9 13l5-5 1 1-5 5H9z" fill="#ff0" stroke="#000"/></svg>',
    reply: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M6 3L1 8l5 5V10c4 0 6 1 8 4 0-5-3-8-8-8z" fill="#39f" stroke="#000"/></svg>',
    fwd: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M10 3l5 5-5 5V10c-4 0-6 1-8 4 0-5 3-8 8-8z" fill="#3c3" stroke="#000"/></svg>',
    del: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M3 3l10 10M13 3L3 13" stroke="#c00" stroke-width="3"/></svg>',
    sr: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="4" width="10" height="8" fill="#fff" stroke="#000"/><path d="M1 4l5 4 5-4" fill="none" stroke="#000"/><path d="M12 2h3v3M15 2l-3 3M12 14h3v-3M15 14l-3-3" stroke="#080" fill="none"/></svg>',
    ab: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="1" width="11" height="14" fill="#c33" stroke="#000"/><rect x="5" y="4" width="7" height="4" fill="#fff" stroke="#000"/><path d="M2 4h2M2 7h2M2 10h2M2 13h2" stroke="#000"/></svg>',
    folder: c => `<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 4h5l1 1h8v9H1z" fill="${c}" stroke="#000"/></svg>`,
    tray: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 8l2-5h10l2 5v6H1z" fill="#ff9" stroke="#000"/><path d="M1 8h4l1 2h4l1-2h4" fill="none" stroke="#000"/></svg>'
  };

  /* ---------- the fictional people who live in each year's mailbox ---------- */
  const PEOPLE = {
    '1995': {
      team: { name: 'The Horizon Team', addr: 'welcome@horizon.net', reply: () => 'Thanks for writing to The Horizon Team! This is an automatic reply.\n\nA reminder: Horizon Mail is pretend. Your messages stay on this computer and are never sent over the real Internet.\n\nThe Horizon Team' },
      pal: { name: 'Penny Larkspur', addr: 'penny.larkspur@prairienet.com', reply: u => pickOne([
        `Hi ${u}!\n\nThanks for your letter! I printed it out and pinned it on the fridge. Captain the goose chased the mail carrier again today. He is not a nice goose.\n\nWrite me again soon and tell me more about you!\n\nYour pen pal,\nPenny`,
        `Hi ${u}!\n\nWe had a big thunderstorm and the power went out, so I had to wait until morning to read your e-mail. It was worth the wait!\n\nWhat games do you like to play on your computer? I like the one with the minefield, but I always click a mine first.\n\nPenny`,
        `Hi ${u}!\n\nI told my whole class about you! Mrs. Ostrander let me put a pin on the big map for you.\n\nOur chicks hatched this week. There are six, and I named the smallest one Floppy, after a floppy disk.\n\nYour friend,\nPenny`]) },
      gran: { name: 'Grandma Rose', addr: 'grandma.rose@prairienet.com', reply: () => 'Thank you for the lovely e-mail, sweetheart! I printed it out to show my card club. They were very impressed that I have e-mail now.\n\nLove,\nGrandma' },
      news: { name: 'The Byte Gazette', addr: 'editor@bytegazette.com', reply: () => 'This is an automatic reply. The Byte Gazette mailbox is not read by a person, so we can\'t answer your message.\n\nThanks for reading! See you next week.' },
      spam: { name: 'Cousin Dale', addr: 'dale.the.great@cyberburbs.com', reply: () => 'Hi, it\'s Dale. This is an automatic reply I set up.\n\nIf you\'re writing about that chain letter: sorry! My mom told me chain letters are junk mail and nothing bad happens if you break them. I\'m not forwarding them anymore.\n\nDale' }
    },
    '2000': {
      team: { name: 'The Horizon Team', addr: 'welcome@horizonmail.com', reply: () => 'Thanks for writing to The Horizon Team! This is an automatic reply.\n\nA reminder: this mail is pretend. Your messages stay on this computer and are never sent over the real Internet.\n\nThe Horizon Team' },
      pal: { name: 'Mateo Ruiz', addr: 'mateo.ruiz@cyberburbs.com', reply: u => pickOne([
        `Hey ${u}!\n\nThanks for writing back so fast! My digital pet keychain is still alive, which is a new record. I think it likes math class.\n\nWhat's the best web site you found this week? Send me the address!\n\nLater,\nMateo`,
        `Hey ${u}!\n\nCool e-mail! I added you to my home page's "Friends" list. It's right under the spinning globe GIF.\n\nWe're still eating the Y2K beans. Send help. (Just kidding. They're good with rice.)\n\nMateo`,
        `Hey ${u}!\n\nGot your message. My little sister wants to know if you have any pets. She has a goldfish named Captain Bubbles.\n\nWrite back soon!\nMateo`]) },
      gran: { name: 'Grandma Rose', addr: 'rose.b@prairienet.com', reply: () => 'Thank you for the lovely e-mail, sweetheart! I read it twice. Your cousin says I should answer with a smiley face, so here it is: :)\n\nLove and hugs,\nGrandma' },
      news: { name: 'NetNook Weekly', addr: 'weekly@netnook.com', reply: () => 'This is an automatic reply. NetNook Weekly can\'t answer e-mail sent to this address.\n\nThanks for reading, and happy surfing!' },
      spam: { name: 'Uncle Walt', addr: 'walt.w@cyberburbs.com', reply: () => 'Hi! This is an automatic reply from Walt.\n\nIf you\'re writing about that "free money" e-mail: oops. My neighbor told me it was a hoax and nobody ever got paid. Sorry for filling up your Inbox!\n\nUncle Walt' }
    }
  };
  const SPAM_NOTE = {
    '1995': 'Heads up: this is a chain letter, a kind of junk mail people call spam. Chain letters promise good luck, or warn about bad luck, to get you to send them to lots of people. None of it is true: nothing happens if you don\'t forward it. The best thing to do is delete it.',
    '2000': 'Heads up: this is a chain letter, a kind of junk mail called spam. Nobody can count how many times an e-mail is forwarded, and no company pays you to forward one. Messages that promise free money or prizes are almost always tricks. The best thing to do is delete it and not send it on.'
  };

  function seeds(E, addr, user) {
    const P = PEOPLE[E];
    const how = `How it works:\n- Click a message to read it.\n- Click New to write a message. In the To box, start typing a name to pick someone from your Address Book.\n- To send and get mail, connect with the modem, then click Send and Receive. Messages you write while offline wait in the Outbox until then.\n- Work Center jobs sometimes arrive as e-mail. Reply to the job e-mail to finish the job.\n\nImportant: this is pretend e-mail. Nothing you write ever leaves this computer, and everyone who writes to you is a made-up character.`;
    if (E === '2000') return [
      { from: P.team, subj: 'Welcome to your new Inbox!', ago: 3 * DAY, body: `Hi ${user},\n\nWelcome to your Inbox! Your new e-mail address is ${addr}.\n\n${how}\n\nEnjoy!\nThe Horizon Team` },
      { from: P.pal, subj: 'We survived Y2K! (your pen pal)', ago: 2 * DAY + 5 * HOUR, body: `Hey ${user}!\n\nIt's Mateo, your pen pal from the Pen Pals Online club. So... the year 2000! My dad filled the bathtub with water and bought 40 cans of beans "just in case." Midnight came, the lights stayed on, and now we're eating beans for a month.\n\nI just got a digital pet keychain and I'm trying to keep it alive through math class. I also started a home page about skateboarding, but so far it's mostly a spinning globe GIF.\n\nWhat's new with you? Got any favorite web sites or games?\n\nLater,\nMateo\n\nP.S. To write back, click Reply.` },
      { from: P.gran, subj: 'I can send pictures now!', ago: DAY + 2 * HOUR, body: 'Hi sweetie,\n\nYour cousin showed me how to scan photos, so now I can send you pictures of the garden. The tomatoes are as big as softballs this year.\n\n(The picture didn\'t come through. Your cousin says I have to click the paper clip. I\'ll try again next time.)\n\nLove and hugs,\nGrandma' },
      { from: P.news, subj: 'NetNook Weekly: 4 smart surfing tips', ago: 20 * HOUR, body: 'NETNOOK WEEKLY\nSmart tips for the new millennium\n------------------------------\n\n1. Keep your secrets secret. Never tell anyone online your real last name, address, school or phone number.\n\n2. Don\'t open e-mail attachments from people you don\'t know. They can carry computer viruses.\n\n3. Pick a good password. Mix letters and numbers, and don\'t use your pet\'s name.\n\n4. If something online makes you feel uncomfortable, tell a grown-up you trust.\n\nHappy surfing!\nNetNook Weekly' },
      { from: P.spam, subj: 'FW: FW: FW: Get PAID to forward this!!! (it really works)', ago: 3 * HOUR, spam: true, body: 'Hi everyone, my buddy at work swears this one is real!!\n\n>>> A big computer company is testing a new e-mail tracking program. For every person you forward this message to, they will pay you $245!!! For every person THEY forward it to, you get $243 more!!!\n>>>\n>>> My neighbor\'s cousin forwarded it and got a check for $4,000!!!\n>>>\n>>> Forward it to EVERYONE you know. It\'s FREE MONEY!!!' }
    ];
    return [
      { from: P.team, subj: 'Welcome to Horizon Mail!', ago: 3 * DAY, body: `Hello ${user},\n\nWelcome to Horizon Mail! Your e-mail address is ${addr}.\n\n${how}\n\nHappy mailing!\nThe Horizon Team` },
      { from: P.pal, subj: 'Hi from Nebraska! (your new pen pal)', ago: 2 * DAY + 4 * HOUR, body: `Dear ${user},\n\nHi! My name is Penny and I'm 11. My teacher, Mrs. Ostrander, signed our class up for the Pen Pals Online program, and I got YOUR name! I've never had an e-mail pen pal before.\n\nI live on a farm near a tiny town. We have 40 cows, a grumpy goose named Captain, and one computer that my whole family shares. My big brother says the modem sounds like a robot gargling.\n\nWhat's it like where you live? Do you have any pets? What's your favorite subject? Mine is science, because we got to hatch chicks in class.\n\nWrite back soon!\nPenny\n\nP.S. To write back, click Reply.` },
      { from: P.gran, subj: 'Testing my new e-mail', ago: DAY + 3 * HOUR, body: 'Hello sweetheart,\n\nYour Uncle Ray set up this e-mail thing on my computer, so I\'m trying it out. Is this how it works? I typed it all in capital letters first, and he said that means I\'m SHOUTING, so I fixed it.\n\nI made a big batch of oatmeal cookies. Come visit soon and bring your appetite.\n\nLove,\nGrandma' },
      { from: P.news, subj: 'The Byte Gazette - Tips of the Week', ago: 22 * HOUR, body: 'THE BYTE GAZETTE\nComputer tips for the whole family\n------------------------------\n\n* Save your work often. If the power blinks, anything you haven\'t saved is gone.\n\n* Keep floppy disks away from magnets, including the ones inside stereo speakers. Magnets can erase them.\n\n* Slide the little tab on a 3.5-inch floppy disk to write-protect it, so nothing on it can be erased by accident.\n\n* If someone picks up the phone while you\'re online, the modem can lose its connection. Ask before you dial in!\n\nSee you next week,\nThe Byte Gazette' },
      { from: P.spam, subj: 'FW: FW: FW: FW: Good luck letter - DO NOT BREAK THE CHAIN!!!', ago: 4 * HOUR, spam: true, body: '-----Forwarded message-----\n\nTHIS IS A GOOD LUCK LETTER!!! It has been around the world 9 times. Send it to 10 friends in the next 10 minutes and something wonderful will happen to you tomorrow.\n\nOne boy sent it to 10 friends and found $20 in his coat pocket. A girl deleted it and her goldfish would not look at her for a week!!!\n\nDO NOT BREAK THE CHAIN!!!!!\n\n> > > Send this to everyone you know > > >' }
    ];
  }

  const CSS = `
  .hm{height:100%;display:flex;flex-direction:column;position:relative;min-width:0;container-type:inline-size;font:12px var(--ui);background:var(--gray);color:#000}
  .hm button{font:inherit;color:inherit}
  .hm svg{width:16px;height:16px;flex:none}
  .hm-top{display:none}
  .hm-short{display:none}
  .hm-tb{display:flex;flex-wrap:wrap;gap:2px;padding:3px;border-bottom:1px solid var(--dk);flex:none}
  .hm-tb .btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:58px;padding:2px 6px;font-size:11px;line-height:1.1}
  .hm-tb .btn svg{width:20px;height:20px}
  .hm-tb .btn:disabled svg{opacity:.4}
  .hm-note{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:3px 3px 0;padding:4px 6px;background:#ffffe1;border:1px solid #000}
  .hm-note[hidden]{display:none}
  .hm-note span{flex:1;min-width:150px}
  .hm-note .btn{min-width:0;padding:2px 10px}
  .hm-main{flex:1;min-height:0;display:flex;gap:3px;padding:3px}
  .hm-fold{width:150px;flex:none;background:#fff;overflow:auto;padding:2px 0}
  .hm-froot{padding:3px 4px;font-weight:bold;display:flex;gap:4px;align-items:center;white-space:nowrap}
  .hm-fold .hm-fi{display:flex;align-items:center;gap:4px;width:calc(100% - 12px);margin-left:12px;border:0;background:none;text-align:left;padding:3px 4px;cursor:pointer;white-space:nowrap;border-left:1px dotted #808080}
  .hm-fold .hm-fi b{margin-left:auto;font-weight:bold;color:#00f}
  .hm-fold .hm-fi.on{background:var(--navy);color:#fff}
  .hm-fold .hm-fi.on b{color:#fff}
  .hm-right{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
  .hm-list{flex:0 0 40%;min-height:60px;overflow:auto;background:#fff;scroll-padding-top:24px}
  .hm-lh,.hm-row{display:grid;grid-template-columns:20px minmax(70px,1fr) minmax(90px,2fr) 108px}
  .hm-lh{position:sticky;top:0;z-index:1}
  .hm-lh span{background:var(--gray);border:1px solid;border-color:#fff var(--dk) var(--dk) #fff;padding:1px 4px;white-space:nowrap;overflow:hidden}
  .hm-row{cursor:pointer;white-space:nowrap;padding:1px 0}
  .hm-row>span{overflow:hidden;text-overflow:ellipsis;padding:1px 4px}
  .hm-row .hm-fl{display:flex;align-items:center;justify-content:center;padding:0}
  .hm-row.un{font-weight:bold}
  .hm-row.sel{background:var(--navy);color:#fff}
  .hm-row.sel .hm-tag{color:#ff0}
  .hm-dot{width:8px;height:8px;background:#00f;border:1px solid #000;display:inline-block}
  .hm-tag{font-size:10px;font-weight:bold;color:#a00;margin-right:4px}
  .hm-empty{padding:14px;color:#555;text-align:center;white-space:normal}
  .hm-prev{flex:1;min-height:0;overflow:auto;background:#fff;display:flex;flex-direction:column}
  .hm-ph{background:var(--gray);padding:4px 6px;border-bottom:1px solid var(--dk);display:grid;grid-template-columns:auto 1fr;gap:1px 8px;flex:none}
  .hm-ph b{white-space:nowrap}
  .hm-ph span{overflow-wrap:anywhere}
  .hm-back{display:none}
  .hm.hm-abmode .hm-prev{display:none}
  .hm.hm-abmode .hm-list{flex:1}
  .hm-pbw{flex:1}
  .hm-pb{padding:8px 10px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.4;user-select:text;-webkit-user-select:text}
  .hm-q{margin:0 10px 10px;padding:4px 8px;border-left:3px solid #0000c0;color:#333;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}
  .hm-box{margin:6px 10px 0;padding:6px 8px;border:1px solid #000;background:#ffffe1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;line-height:1.35}
  .hm-box p{margin:0;flex:1 1 200px}
  .hm-box .btn{min-width:0;padding:2px 10px}
  .hm-box.job{background:#e6ffe6}
  .hm-box.spam{background:#fff0d0}
  .hm-box.auto{background:#eef}
  .hm-stat{flex:none;display:flex;gap:3px;padding:2px 3px}
  .hm-stat span{border:1px solid;border-color:var(--dk) #fff #fff var(--dk);padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hm-stat span:first-child{flex:1}
  .hm-ab{padding:8px;display:flex;flex-direction:column;gap:6px}
  .hm-ab h3{margin:0;font-size:13px}
  .hm-abr{display:flex;align-items:center;gap:6px;padding:4px;border-bottom:1px solid #ddd;flex-wrap:wrap}
  .hm-abr span{flex:1 1 160px;min-width:0;overflow-wrap:anywhere}
  .hm-abr small{color:#555}
  .hm-abr .btn,.hm-abf .btn{min-width:0;padding:2px 10px}
  .hm-abf{display:flex;gap:4px;flex-wrap:wrap;align-items:center;padding-top:6px}
  .hm-abf input{flex:1 1 120px;min-width:0}
  .hm input[type=text],.hm textarea{font:inherit;font-size:13px;padding:2px 4px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);background:#fff;color:#000;min-height:26px;user-select:text;-webkit-user-select:text}
  .hm-ov{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;padding:8px}
  .hm-ov[hidden]{display:none}
  .hm-cw{width:100%;max-width:580px;height:100%;max-height:460px;display:flex;flex-direction:column;padding:3px}
  .hm-dw{width:100%;max-width:340px;display:flex;flex-direction:column;padding:3px}
  .hm-ct{background:var(--navy);color:#fff;font-weight:bold;padding:2px 4px 2px 6px;display:flex;align-items:center;gap:6px;flex:none}
  .hm-ct span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .hm-ct .btn{min-width:0;width:20px;height:18px;padding:0;line-height:1;font-weight:bold}
  .hm-ctb{display:flex;gap:3px;padding:4px 3px;flex-wrap:wrap;flex:none}
  .hm-ctb .btn{min-width:0;padding:3px 12px;display:flex;align-items:center;gap:4px}
  .hm-f{display:flex;align-items:center;gap:6px;padding:2px 4px;flex:none;position:relative}
  .hm-f label{width:52px;text-align:right;flex:none}
  .hm-f input{flex:1;min-width:0}
  .hm-sug{position:absolute;left:62px;right:4px;top:100%;z-index:5;background:#fff;border:1px solid #000;box-shadow:2px 2px 0 rgba(0,0,0,.4);max-height:170px;overflow:auto}
  .hm-sug[hidden]{display:none}
  .hm-sug button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:5px 6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hm-sug button:focus,.hm-sug button.hi{background:var(--navy);color:#fff}
  .hm-cw textarea{flex:1;min-height:80px;margin:4px;resize:none;font-size:13px;line-height:1.35}
  .hm-cq{flex:none;max-height:28%;overflow:auto;margin:0 4px 4px;padding:3px 6px;background:#fff;border:1px solid var(--dk);white-space:pre-wrap;overflow-wrap:anywhere;color:#333;font-size:11px}
  .hm-cq[hidden]{display:none}
  .hm-cf{flex:none;padding:0 6px 3px;font-size:11px;color:#333}
  .hm-dl{padding:12px 12px 6px;display:flex;flex-direction:column;gap:8px;line-height:1.4}
  .hm-dl p{margin:0}
  .hm-bar{height:16px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);background:#fff;padding:1px;display:flex}
  .hm-bar i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,var(--navy) 0 9px,transparent 9px 11px);transition:width .25s}
  .hm-db{display:flex;justify-content:center;gap:6px;padding:4px 8px 10px;flex-wrap:wrap}
  .hm-db .btn{min-width:80px}

  /* ---------- 2000: slicker webmail look ---------- */
  .hm.e2000{font:12px Tahoma,Verdana,var(--ui);background:#fff}
  .hm.e2000 .hm-top{display:flex;align-items:center;gap:10px;padding:6px 10px;background:linear-gradient(90deg,#0a246a,#3a6ea5 60%,#a6caf0);color:#fff;flex:none}
  .hm.e2000 .hm-top svg{width:28px;height:28px}
  .hm.e2000 .hm-brand{font:bold 18px/1 Verdana,Tahoma,sans-serif;letter-spacing:-.5px}
  .hm.e2000 .hm-who{margin-left:auto;text-align:right;font-size:11px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .hm.e2000 .hm-tb{background:linear-gradient(#f7f7f3,#e3e1d8);border-bottom:1px solid #b0aca0}
  .hm.e2000 .hm-tb .btn{background:transparent;border-color:transparent;box-shadow:none;flex-direction:row;gap:5px;font-size:12px;min-height:30px;border-radius:3px}
  .hm.e2000 .hm-tb .btn:hover:not(:disabled){border:1px solid #316ac5;background:#c1d2ee}
  .hm.e2000 .hm-tb .btn.hm-srb{font-weight:bold}
  .hm.e2000 .hm-note{background:linear-gradient(#fffbe0,#fff2a8);border:1px solid #d6b600;border-radius:4px;margin:4px 6px 0}
  .hm.e2000 .hm-main{padding:0;gap:0}
  .hm.e2000 .hm-fold{background:#eef3fb;border:0;border-right:1px solid #a6caf0;box-shadow:none;width:160px;padding:6px 0}
  .hm.e2000 .hm-froot{color:#0a246a;padding:4px 10px}
  .hm.e2000 .hm-fold .hm-fi{margin:0;width:100%;border:0;padding:5px 10px;color:#0a246a}
  .hm.e2000 .hm-fold .hm-fi b{color:#0a246a}
  .hm.e2000 .hm-fold .hm-fi.on{background:#316ac5;color:#fff}
  .hm.e2000 .hm-fold .hm-fi.on b{color:#fff}
  .hm.e2000 .hm-right{gap:0}
  .hm.e2000 .hm-list,.hm.e2000 .hm-prev{border:0;box-shadow:none}
  .hm.e2000 .hm-list{border-bottom:3px solid #d6dff0}
  .hm.e2000 .hm-lh span{background:linear-gradient(#fff,#e8e8e0);border:0;border-right:1px solid #ccc;border-bottom:1px solid #aaa;padding:3px 6px}
  .hm.e2000 .hm-row{padding:3px 0;border-bottom:1px solid #eef}
  .hm.e2000 .hm-row.sel{background:#316ac5}
  .hm.e2000 .hm-dot{border-radius:50%;background:#f90;border-color:#c60}
  .hm.e2000 .hm-ph{background:linear-gradient(#f4f7fc,#e3eaf6);border-bottom:1px solid #a6caf0;padding:8px 10px}
  .hm.e2000 .hm-box{border-radius:4px;border-color:#b0b8c8}
  .hm.e2000 .hm-q{border-left-color:#316ac5}
  .hm.e2000 .hm-stat{background:#ece9d8;border-top:1px solid #b0aca0}
  .hm.e2000 .hm-ct{background:linear-gradient(90deg,#0a246a,#a6caf0)}
  .hm.e2000 .hm-bar i{background:linear-gradient(#8fb4f0,#316ac5);border-radius:2px}
  .hm.e2000 input[type=text],.hm.e2000 textarea{border:1px solid #7f9db9}

  /* ---------- phones and narrow windows ---------- */
  @container (max-width:540px){
    .hm-tb .btn{min-width:0;flex:1 1 0;min-height:44px;padding:2px 3px;font-size:10px}
    .hm.e2000 .hm-tb .btn{flex-direction:column;font-size:10px;gap:1px}
    .hm-tb .btn .hm-long{display:none}
    .hm-tb .btn .hm-short{display:inline}
    .hm-main{flex-direction:column}
    .hm-fold,.hm.e2000 .hm-fold{width:auto;display:flex;overflow-x:auto;padding:0;flex:none;border-right:0;border-bottom:1px solid #a6caf0}
    .hm-froot{display:none}
    .hm-fold .hm-fi,.hm.e2000 .hm-fold .hm-fi{width:auto;margin:0;border:0;padding:10px 10px;flex:none}
    .hm-list{flex:1}
    .hm-prev{display:none}
    .hm.hm-reading .hm-fold,.hm.hm-reading .hm-list{display:none}
    .hm.hm-reading .hm-prev{display:flex;flex:1}
    .hm-back{display:inline-block;grid-column:1/-1;justify-self:start;min-width:0;padding:6px 14px;margin-bottom:4px}
    .hm-lh{display:none}
    .hm-row{grid-template-columns:18px 1fr auto;grid-template-areas:"f a d" "f s s";padding:6px 0}
    .hm-row .hm-fl{grid-area:f}.hm-row .hm-a{grid-area:a}.hm-row .hm-s{grid-area:s}.hm-row .hm-d{grid-area:d;font-size:11px}
    .hm-ov{padding:0}
    .hm-cw{max-width:none;max-height:none}
    .hm-f input,.hm input[type=text]{min-height:36px;font-size:16px}
    .hm-cw textarea{font-size:16px}
    .hm-f label{width:48px}
    .hm-sug{left:58px}
    .hm-sug button{padding:10px 8px}
    .hm-ctb .btn,.hm-db .btn,.hm-note .btn,.hm-box .btn,.hm-abr .btn,.hm-abf .btn{min-height:40px}
    .hm.e2000 .hm-top{padding:4px 8px}
  }
  `;

  function open(W, api) {
    const E = api.era.id === '2000' ? '2000' : '1995';
    const Y = api.era.year || +E;
    const NAME = E === '2000' ? 'Inbox' : 'Horizon Mail';
    const DOM = E === '2000' ? 'horizonmail.com' : 'horizon.net';
    const SERVER = 'mail.' + DOM;
    const P = PEOPLE[E];
    const KNOWN = [P.team, P.pal, P.gran, P.news, P.spam];
    const DEV = /[?&]dev\b/.test(location.search);
    const user = () => String(api.user || 'kidsurfer');
    const me = () => (user().toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'kidsurfer') + '@' + DOM;
    const eraNow = () => { const d = new Date(); d.setFullYear(Y); return d.getTime(); };
    const timers = new Set();
    const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); if (!closed) fn(); }, ms); timers.add(t); return t; };
    let closed = false, busy = false, cur = 'inbox', sel = null, comp = null, noteT = 0;

    /* ---------- storage ---------- */
    const KEY = 'box' + E;
    const CAP = { inbox: 60, outbox: 20, sent: 40, drafts: 20, trash: 30 };
    let seq = 1;
    const nid = () => 'm' + Date.now().toString(36) + (seq++);
    function fresh() {
      const now = eraNow();
      return {
        msgs: seeds(E, me(), user()).map((m, i) => ({ id: 's' + i, f: 'inbox', from: { name: m.from.name, addr: m.from.addr }, to: me(), subj: m.subj, body: m.body, ts: now - m.ago, read: false, spam: !!m.spam })),
        contacts: KNOWN.filter(c => c !== P.spam && c !== P.news).map(c => ({ name: c.name, addr: c.addr })),
        pending: [], jobs: []
      };
    }
    let box = api.load(KEY, null);
    if (!box || !Array.isArray(box.msgs)) box = fresh();
    box.contacts = Array.isArray(box.contacts) ? box.contacts : [];
    box.pending = Array.isArray(box.pending) ? box.pending : [];
    box.jobs = Array.isArray(box.jobs) ? box.jobs : [];
    function save() {
      const keep = [];
      Object.keys(CAP).forEach(f => keep.push(...box.msgs.filter(m => m.f === f).sort((a, b) => b.ts - a.ts).slice(0, CAP[f])));
      box.msgs = keep;
      box.pending = box.pending.slice(-20); box.jobs = box.jobs.slice(-60); box.contacts = box.contacts.slice(0, 40);
      api.save(KEY, box);
    }
    const byId = id => box.msgs.find(m => m.id === id);
    const inFolder = f => box.msgs.filter(m => m.f === f).sort((a, b) => b.ts - a.ts);
    const unread = () => box.msgs.filter(m => m.f === 'inbox' && !m.read).length;

    /* ---------- safety filter: bad words masked, personal info hidden ---------- */
    function clean(t) {
      t = String(t || '');
      const BB = window.BuddyBrain;
      if (!t.trim() || !BB || typeof BB.filter !== 'function') return { t, hit: false };
      try { const f = BB.filter(t); if (f.flagged || f.pii) return { t: f.clean, hit: true }; } catch (e) { }
      return { t, hit: false };
    }

    /* ---------- Work Center job mail ---------- */
    function allJobs() {
      let j = [];
      try { j = api.jobs() || []; } catch (e) { }
      if (DEV) { try { const t = JSON.parse(localStorage.getItem('r1990:mailTestJobs') || '[]'); if (Array.isArray(t)) j = j.concat(t); } catch (e) { } }
      return (Array.isArray(j) ? j : []).filter(x => x && x.id != null);
    }
    const jobById = id => allJobs().find(j => String(j.id) === String(id));
    function addContact(name, addr, work) {
      addr = String(addr || '').trim().toLowerCase(); if (!EMAIL_RE.test(addr)) return;
      const c = box.contacts.find(x => x.addr === addr);
      if (c) { if (work) c.work = true; return; }
      box.contacts.push({ name: String(name || addr.split('@')[0]).slice(0, 40), addr, work: !!work });
    }
    function syncJobs() {
      const day = new Date().toDateString(); let added = 0;
      allJobs().forEach(j => {
        if (!j.mail || typeof j.mail !== 'object') return;
        const key = j.id + '|' + day;
        if (box.jobs.includes(key)) return;
        box.jobs.push(key);
        const from = { name: String((j.from && j.from.name) || 'Work Center'), addr: String((j.from && j.from.addr) || 'jobs@workcenter.com').toLowerCase() };
        box.msgs.push({ id: nid(), f: 'inbox', from, to: me(), subj: String(j.mail.subject || j.title || 'A job for you').slice(0, 150), body: String(j.mail.body || j.instructions || ''), ts: eraNow(), read: false, job: j.id });
        addContact(from.name, from.addr, true);
        added++;
      });
      if (added) save();
      return added;
    }

    /* ---------- pretend auto-replies ---------- */
    function replier(addr) {
      const a = addr.toLowerCase();
      const k = KNOWN.find(c => c.addr === a);
      if (k) return { from: { name: k.name, addr: k.addr }, body: k.reply(user()) };
      const j = allJobs().find(x => x.from && String(x.from.addr || '').toLowerCase() === a);
      const c = box.contacts.find(x => x.addr === a && x.work);
      if (j || c) {
        const name = j ? String(j.from.name || 'Work Center') : c.name;
        return { from: { name, addr: a }, body: null, work: true };
      }
      return null;
    }
    const addrs = s => String(s || '').split(/[,;]/).map(x => { const m = x.match(EMAIL_RE); return m ? m[0].toLowerCase() : null; }).filter(Boolean);
    function schedule(m) {
      addrs(m.to).forEach(a => {
        const r = replier(a); if (!r) return;
        const body = r.work ? `Thanks, ${user()}! We got your message about "${stripRe(m.subj) || 'the job'}" and it's just what we needed.\n\n${r.from.name}` : r.body;
        const delay = 5000 + Math.random() * 4000;
        box.pending.push({ due: Date.now() + delay, m: { from: r.from, subj: 'Re: ' + (stripRe(m.subj) || '(no subject)') + ' (automatic reply)', body, auto: true } });
        later(delay + 300, () => checkPending(false));
      });
    }
    function checkPending(inSR) {
      if (!api.online()) return 0;
      const now = Date.now(), due = box.pending.filter(p => p.due <= now);
      if (!due.length) return 0;
      box.pending = box.pending.filter(p => p.due > now);
      due.forEach(p => box.msgs.push(Object.assign({ id: nid(), f: 'inbox', to: me(), ts: eraNow(), read: false }, p.m)));
      save();
      if (!inSR) { notifyNew(due.length); render(); }
      return due.length;
    }

    /* ---------- sound ---------- */
    function modemSound() {
      const q = E === '2000' ? 0.6 : 1;
      api.tone(1650, 0.16 * q, { type: 'sine', vol: 0.05 });
      api.tone(2100, 0.3 * q, { type: 'sine', vol: 0.05, at: 0.2 * q });
      api.noise(0.5 * q, { f: 1800, q: 0.8, vol: 0.06, at: 0.55 * q });
      api.tone(1200, 0.2 * q, { type: 'square', vol: 0.03, at: 0.6 * q, to: 2400 });
      api.noise(0.35 * q, { f: 1100, q: 1.5, vol: 0.05, at: 1.1 * q });
    }

    /* ---------- dates ---------- */
    const p2 = n => (n < 10 ? '0' : '') + n;
    const hm = d => `${d.getHours() % 12 || 12}:${p2(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
    function shortDate(ts) {
      const d = new Date(ts);
      if (E === '1995') return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} ${hm(d)}`;
      const n = new Date(eraNow());
      return d.toDateString() === n.toDateString() ? hm(d) : `${MON[d.getMonth()]} ${d.getDate()}`;
    }
    const longDate = ts => { const d = new Date(ts); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${hm(d)}`; };
    const who = f => f ? (f.name ? `${f.name} <${f.addr}>` : f.addr) : '';

    /* ---------- layout ---------- */
    W.body.innerHTML = `<div class="hm e${E}">
      <div class="hm-top">${ICON}<span class="hm-brand">Inbox</span><span class="hm-who"></span></div>
      <div class="hm-tb">
        <button class="btn" data-a="new" title="New message">${I.new}<span>New<span class="hm-long"> Message</span></span></button>
        <button class="btn" data-a="reply" title="Reply">${I.reply}<span>Reply</span></button>
        <button class="btn" data-a="fwd" title="Forward">${I.fwd}<span>Forward</span></button>
        <button class="btn" data-a="del" title="Delete">${I.del}<span>Delete</span></button>
        <button class="btn hm-srb" data-a="sr" title="Send and Receive">${I.sr}<span class="hm-long">Send and Receive</span><span class="hm-short">Send/Recv</span></button>
        <button class="btn" data-a="ab" title="Address Book">${I.ab}<span>Address<span class="hm-long"> Book</span></span></button>
      </div>
      <div class="hm-note" hidden role="status"><span></span></div>
      <div class="hm-main">
        <div class="hm-fold sunken" role="tablist" aria-label="Folders"></div>
        <div class="hm-right">
          <div class="hm-list sunken" role="list" aria-label="Messages"></div>
          <div class="hm-prev sunken" aria-live="polite"></div>
        </div>
      </div>
      <div class="hm-stat"><span class="hm-s1"></span><span class="hm-s2"></span></div>
      <div class="hm-ov hm-cov" hidden></div>
      <div class="hm-ov hm-dov" hidden></div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s);
    const foldEl = $('.hm-fold'), listEl = $('.hm-list'), prevEl = $('.hm-prev'), noteEl = $('.hm-note'), cov = $('.hm-cov'), dov = $('.hm-dov');

    const FOLDERS = [['inbox', 'Inbox'], ['outbox', 'Outbox'], ['sent', 'Sent Items'], ['drafts', 'Drafts'], ['trash', E === '2000' ? 'Trash' : 'Deleted Items'], ['ab', 'Address Book']];
    const fname = f => (FOLDERS.find(x => x[0] === f) || ['', ''])[1];
    const ficon = f => f === 'inbox' ? I.tray : f === 'ab' ? I.ab : f === 'trash' ? I.folder('#ccc') : f === 'outbox' ? I.folder('#fc6') : I.folder('#ff9');

    function render() {
      if (closed) return;
      // folders
      foldEl.innerHTML = `<div class="hm-froot">${E === '1995' ? I.folder('#9cf') + 'Horizon Mail' : 'Folders'}</div>` + FOLDERS.map(([f, n]) => {
        const c = f === 'inbox' ? unread() : (f === 'outbox' || f === 'drafts') ? inFolder(f).length : 0;
        return `<button class="hm-fi${cur === f ? ' on' : ''}" data-f="${f}" role="tab" aria-selected="${cur === f}">${ficon(f)}<span>${n}</span>${c ? `<b>(${c})</b>` : ''}</button>`;
      }).join('');
      R.classList.toggle('hm-abmode', cur === 'ab');
      if (cur === 'ab') { renderAB(); }
      else {
        const ms = inFolder(cur);
        if (sel && !ms.some(m => m.id === sel)) sel = null;
        const toCol = cur === 'sent' || cur === 'outbox' || cur === 'drafts';
        listEl.innerHTML = `<div class="hm-lh"><span></span><span>${toCol ? 'To' : 'From'}</span><span>Subject</span><span>${toCol ? 'Date' : 'Received'}</span></div>` +
          (ms.length ? ms.map(m => {
            const flag = m.f === 'inbox' && !m.read ? '<i class="hm-dot" title="Unread"></i>' : '';
            const tag = m.job ? '<span class="hm-tag">JOB</span>' : m.spam ? '<span class="hm-tag">JUNK</span>' : '';
            const a = toCol ? (m.to || '(nobody yet)') : (m.from && (m.from.name || m.from.addr));
            return `<div class="hm-row${m.f === 'inbox' && !m.read ? ' un' : ''}${m.id === sel ? ' sel' : ''}" data-id="${m.id}" role="listitem" tabindex="0"><span class="hm-fl">${flag}</span><span class="hm-a">${escH(a)}</span><span class="hm-s">${tag}${escH(m.subj || '(no subject)')}</span><span class="hm-d">${shortDate(m.ts)}</span></div>`;
          }).join('') : `<div class="hm-empty">There are no messages in ${escH(fname(cur))}.</div>`);
        renderPreview();
      }
      const on = api.online();
      $('.hm-s1').textContent = cur === 'ab' ? `${box.contacts.length} contact${box.contacts.length === 1 ? '' : 's'}` : `${inFolder(cur).length} message(s), ${unread()} unread in Inbox`;
      $('.hm-s2').textContent = on ? `Online: ${SERVER}` : 'Working offline';
      $('.hm-who').innerHTML = `${escH(me())}<br>${on ? 'Connected' : 'Offline'}`;
      const m = sel && byId(sel);
      R.querySelector('[data-a="reply"]').disabled = !m || cur === 'ab';
      R.querySelector('[data-a="fwd"]').disabled = !m || cur === 'ab';
      R.querySelector('[data-a="del"]').disabled = !m || cur === 'ab';
      const u = unread();
      api.setTitle(`${NAME} - ${fname(cur)}${u ? ` (${u} unread)` : ''}`);
    }

    function renderPreview() {
      const m = sel && byId(sel);
      if (!m) { prevEl.innerHTML = `<div class="hm-empty">${inFolder(cur).length ? 'Click a message to read it here.' : ''}</div>`; return; }
      const boxes = [];
      if (m.spam) boxes.push(`<div class="hm-box spam"><p>${escH(SPAM_NOTE[E])}</p><button class="btn" data-a="del">Delete it</button></div>`);
      if (m.job) {
        const j = jobById(m.job);
        const pay = j && j.pay != null ? ` It pays $${Number(j.pay).toFixed(2)}.` : '';
        const byMail = j && (!j.event || j.event === 'mail-send');
        const txt = !j ? 'Work Center job e-mail. This job is from an earlier day.' : j.done ? `Work Center job: ${j.title || 'job'}. Finished, nice work!` : `Work Center job: ${j.title || 'job'}.${pay} ` + (byMail ? 'Answer it with Reply (or a new message, if it asks you to write to someone).' : 'Do the work in the program it names; the Work Center checks it automatically.');
        boxes.push(`<div class="hm-box job"><p>${escH(txt)}</p>${byMail && !j.done ? '<button class="btn" data-a="reply">Reply</button>' : ''}</div>`);
      }
      if (m.auto) boxes.push('<div class="hm-box auto"><p>This is a pretend automatic reply. The computer wrote it for you; no real person sent it.</p></div>');
      if (m.masked) boxes.push('<div class="hm-box"><p>To keep you safe, some words or personal details (like phone numbers or addresses) were hidden in this message.</p></div>');
      if (m.f === 'outbox') boxes.push(`<div class="hm-box"><p>This message is waiting to be sent. Connect to the Internet, then click Send and Receive.</p><button class="btn" data-a="sr">Send and Receive</button></div>`);
      if (m.f === 'drafts') boxes.push('<div class="hm-box"><p>This is a draft you haven\'t sent yet.</p><button class="btn" data-a="edit">Edit draft</button></div>');
      if (m.f === 'trash') boxes.push('<div class="hm-box"><p>This message is in the trash.</p><button class="btn" data-a="restore">Put it back</button></div>');
      prevEl.innerHTML = `<div class="hm-ph"><button class="btn hm-back" data-a="back">&lt; Back to ${escH(fname(cur))}</button>
        <b>From:</b><span>${escH(who(m.from))}</span><b>To:</b><span>${escH(m.to || '')}</span><b>Date:</b><span>${longDate(m.ts)}</span><b>Subject:</b><span>${escH(m.subj || '(no subject)')}</span></div>
        ${boxes.join('')}<div class="hm-pbw"><div class="hm-pb"></div>${m.quote ? '<div class="hm-q"></div>' : ''}</div>`;
      prevEl.querySelector('.hm-pb').textContent = m.body || '';
      if (m.quote) prevEl.querySelector('.hm-q').textContent = m.quote;
      prevEl.scrollTop = 0;
    }

    function renderAB() {
      const list = box.contacts.slice().sort((a, b) => a.name.localeCompare(b.name));
      listEl.innerHTML = `<div class="hm-ab"><h3>Address Book</h3>` + (list.length ? list.map(c => `<div class="hm-abr"><span><b>${escH(c.name)}</b><br><small>${escH(c.addr)}${c.work ? ' (Work Center)' : ''}</small></span><button class="btn" data-a="write" data-addr="${escH(c.addr)}">Write</button><button class="btn" data-a="rmc" data-addr="${escH(c.addr)}">Remove</button></div>`).join('') : '<div class="hm-empty">Your Address Book is empty.</div>') +
        `<form class="hm-abf"><input type="text" name="n" placeholder="Name" aria-label="Name" maxlength="40"><input type="text" name="a" placeholder="E-mail address" aria-label="E-mail address" maxlength="80"><button class="btn" type="submit">Add</button></form><div class="hm-cf">Tip: everyone here is pretend, and mail to them stays on this computer.</div></div>`;
      listEl.querySelector('.hm-abf').onsubmit = e => {
        e.preventDefault();
        const f = e.target, n = f.n.value.trim(), a = f.a.value.trim().toLowerCase();
        if (!EMAIL_RE.test(a)) { api.msgBox(NAME, 'Please type an e-mail address with an @ sign, like pal@cyberburbs.com.', ['OK'], 'warn'); return; }
        const cn = clean(n);
        addContact(cn.t || a.split('@')[0], a.match(EMAIL_RE)[0], false); save(); api.sfx.click(); render();
      };
    }

    /* ---------- notices ---------- */
    function note(text, btns = [], ms = 9000) {
      clearTimeout(noteT);
      noteEl.hidden = false;
      noteEl.innerHTML = `<span></span>` + btns.map((b, i) => `<button class="btn" data-nb="${i}">${escH(b[0])}</button>`).join('') + '<button class="btn" data-nb="x" aria-label="Close notice">OK</button>';
      noteEl.querySelector('span').textContent = text;
      noteEl.querySelectorAll('[data-nb]').forEach(b => { b.onclick = () => { noteEl.hidden = true; if (b.dataset.nb !== 'x') btns[+b.dataset.nb][1](); }; });
      if (ms) noteT = later(ms, () => { noteEl.hidden = true; });
    }
    function notifyNew(n) {
      if (!n) return;
      if (E === '2000') { api.sfx.msg(); note(`Special delivery! ${n} new message${n === 1 ? ' just landed' : 's just landed'} in your Inbox.`, cur === 'inbox' ? [] : [['Go to Inbox', () => go('inbox')]]); }
      else { api.sfx.ding(); note(`You have ${n} new message${n === 1 ? '' : 's'} in your Inbox.`, cur === 'inbox' ? [] : [['Open Inbox', () => go('inbox')]]); }
    }

    /* ---------- dialogs inside the window ---------- */
    function dialog(title, html) {
      dov.hidden = false;
      dov.innerHTML = `<div class="hm-dw raised" role="dialog" aria-label="${escH(title)}"><div class="hm-ct"><span>${escH(title)}</span></div>${html}</div>`;
      return dov.firstElementChild;
    }
    const closeDialog = () => { dov.hidden = true; dov.innerHTML = ''; };
    function offlineDialog(extra) {
      const d = dialog(NAME, `<div class="hm-dl"><p>You're not connected to the Internet right now. ${E === '2000' ? 'Your Inbox' : NAME} needs the modem to send and get mail.</p><p>${escH(extra || 'You can still read your mail and write new messages. Messages you send while offline wait in the Outbox.')}</p></div><div class="hm-db"><button class="btn" data-d="conn">Connect</button><button class="btn" data-d="no">Not now</button></div>`);
      d.querySelector('[data-d="conn"]').onclick = () => { closeDialog(); api.openApp('dial'); };
      d.querySelector('[data-d="no"]').onclick = closeDialog;
      d.querySelector('[data-d="conn"]').focus();
    }

    async function sendReceive() {
      if (busy || closed) return;
      if (!api.online()) { offlineDialog(); return; }
      busy = true;
      const out = inFolder('outbox').reverse();
      const d = dialog(E === '2000' ? 'Send/Receive' : 'Horizon Mail', `<div class="hm-dl"><p class="hm-pt">Connecting to ${SERVER}...</p><div class="hm-bar"><i></i></div><p class="hm-ps">&nbsp;</p></div><div class="hm-db"><button class="btn" disabled>Please wait</button></div>`);
      const pt = d.querySelector('.hm-pt'), bar = d.querySelector('.hm-bar i'), ps = d.querySelector('.hm-ps');
      const pace = E === '2000' ? 350 : 650;
      const steps = 2 + out.length; let k = 0;
      const tick = () => { k++; bar.style.width = Math.min(100, Math.round(k / steps * 100)) + '%'; };
      modemSound();
      await api.sleep(pace); if (closed) return;
      tick();
      for (let i = 0; i < out.length; i++) {
        pt.textContent = `Sending message ${i + 1} of ${out.length}...`; ps.textContent = out[i].subj || '(no subject)';
        await api.sleep(pace); if (closed) return;
        deliver(out[i]); tick();
      }
      pt.textContent = 'Checking for new mail...'; ps.innerHTML = '&nbsp;';
      await api.sleep(pace * 1.2); if (closed) return;
      const got = syncJobs() + checkPending(true);
      tick(); await api.sleep(250); if (closed) return;
      closeDialog(); busy = false;
      if (out.length) api.sfx.sent();
      if (got) { notifyNew(got); if (cur !== 'inbox' && cur !== 'ab') go('inbox'); }
      else note(out.length ? `Sent ${out.length} message${out.length === 1 ? '' : 's'}. No new messages.` : 'No new messages. Check again later!', [], 5000);
      render();
    }

    function deliver(m) {
      m.f = 'sent'; m.ts = eraNow();
      try { api.task('mail-send', { to: m.to, subject: m.subj, body: m.body, replyTo: m.rt || null }); } catch (e) { }
      addrs(m.to).forEach(a => addContact(null, a, false));
      schedule(m);
      save();
    }

    /* ---------- compose ---------- */
    function compose(o = {}) {
      if (comp) return;
      comp = { rt: o.rt || null, quote: o.quote || '', draft: o.draft || null, title: o.title || 'New Message' };
      cov.hidden = false;
      cov.innerHTML = `<div class="hm-cw raised" role="dialog" aria-label="${escH(comp.title)}">
        <div class="hm-ct"><span>${escH(comp.title)}</span><button class="btn" data-c="x" aria-label="Close">x</button></div>
        <div class="hm-ctb"><button class="btn" data-c="send">${I.sr}Send</button><button class="btn" data-c="draft">Save Draft</button><button class="btn" data-c="x">Cancel</button></div>
        <div class="hm-f"><label for="hm-to-${E}">To:</label><input type="text" id="hm-to-${E}" class="hm-to" autocomplete="off" maxlength="200" placeholder="Start typing a name or address"><div class="hm-sug" hidden role="listbox"></div></div>
        <div class="hm-f"><label for="hm-sj-${E}">Subject:</label><input type="text" id="hm-sj-${E}" class="hm-sj" maxlength="120"></div>
        <textarea class="hm-tx" maxlength="2000" aria-label="Message" placeholder="Write your message here."></textarea>
        <div class="hm-cq" ${comp.quote ? '' : 'hidden'}></div>
        <div class="hm-cf">${api.online() ? 'Pretend mail: it stays on this computer.' : 'You\'re offline: Send puts this in the Outbox. Pretend mail stays on this computer.'}</div>
      </div>`;
      const to = cov.querySelector('.hm-to'), sj = cov.querySelector('.hm-sj'), tx = cov.querySelector('.hm-tx'), sug = cov.querySelector('.hm-sug');
      to.value = o.to || ''; sj.value = o.subj || ''; tx.value = o.body || '';
      if (comp.quote) cov.querySelector('.hm-cq').textContent = comp.quote;
      comp.start = to.value + '\u0001' + sj.value + '\u0001' + tx.value;
      comp.els = { to, sj, tx, sug };
      let hi = -1, items = [];
      const people = () => {
        const all = box.contacts.slice();
        allJobs().forEach(j => { if (j.from && j.from.addr && !all.some(c => c.addr === String(j.from.addr).toLowerCase())) all.push({ name: String(j.from.name || ''), addr: String(j.from.addr).toLowerCase(), work: true }); });
        return all;
      };
      function suggest() {
        const parts = to.value.split(','), q = parts[parts.length - 1].trim().toLowerCase();
        items = q ? people().filter(c => c.name.toLowerCase().includes(q) || c.addr.includes(q)).slice(0, 6) : [];
        if (items.length === 1 && items[0].addr === q) items = [];
        hi = -1;
        sug.hidden = !items.length;
        sug.innerHTML = items.map((c, i) => `<button type="button" role="option" data-i="${i}">${escH(c.name)} &lt;${escH(c.addr)}&gt;</button>`).join('');
      }
      function take(i) {
        const c = items[i]; if (!c) return;
        const parts = to.value.split(','); parts[parts.length - 1] = (parts.length > 1 ? ' ' : '') + c.addr;
        to.value = parts.join(','); sug.hidden = true; items = []; api.sfx.click();
        (sj.value ? tx : sj).focus();
      }
      to.addEventListener('input', suggest);
      to.addEventListener('keydown', e => {
        if (sug.hidden) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; sug.querySelectorAll('button').forEach((b, i) => b.classList.toggle('hi', i === hi)); }
        else if (e.key === 'Enter' || e.key === 'Tab') { if (items.length) { e.preventDefault(); take(hi < 0 ? 0 : hi); } }
        else if (e.key === 'Escape') { e.stopPropagation(); sug.hidden = true; }
      });
      to.addEventListener('blur', () => later(200, () => { if (comp && document.activeElement && !sug.contains(document.activeElement)) sug.hidden = true; }));
      sug.addEventListener('pointerdown', e => e.preventDefault());
      sug.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) take(+b.dataset.i); });
      cov.querySelector('.hm-cw').addEventListener('click', e => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        if (b.dataset.c === 'send') sendComposed();
        else if (b.dataset.c === 'draft') saveDraft(true);
        else closeCompose();
      });
      (to.value ? tx : to).focus();
      if (to.value && tx.setSelectionRange) tx.setSelectionRange(0, 0);
    }
    const compDirty = () => comp && (comp.els.to.value + '\u0001' + comp.els.sj.value + '\u0001' + comp.els.tx.value) !== comp.start;
    function hideCompose() { comp = null; cov.hidden = true; cov.innerHTML = ''; }
    async function closeCompose() {
      if (!comp) return;
      if (!compDirty() || !comp.els.tx.value.trim() && !comp.els.sj.value.trim() && !comp.els.to.value.trim()) { hideCompose(); return; }
      const r = await api.msgBox(NAME, 'Do you want to save this message in your Drafts folder?', ['Yes', 'No', 'Cancel'], 'warn');
      if (closed || !comp) return;
      if (r === 'Yes') saveDraft(false);
      else if (r === 'No') hideCompose();
    }
    function buildMsg(folder) {
      const { to, sj, tx } = comp.els;
      const s = clean(sj.value.trim()), b = clean(tx.value);
      let rt = comp.rt;
      if (!rt) { const tos = addrs(to.value); const j = allJobs().find(x => x.mail && !x.done && (!x.event || x.event === 'mail-send') && x.from && tos.includes(String(x.from.addr || '').toLowerCase())); if (j) rt = j.id; }
      return { id: nid(), f: folder, from: { name: user(), addr: me() }, to: to.value.trim().replace(/,\s*$/, ''), subj: s.t.slice(0, 120), body: b.t.slice(0, 2000), quote: comp.quote ? comp.quote.slice(0, 2500) : '', ts: eraNow(), read: true, rt: rt || null, masked: s.hit || b.hit };
    }
    function saveDraft(fromButton) {
      if (!comp) return;
      const m = buildMsg('drafts');
      if (comp.draft) box.msgs = box.msgs.filter(x => x.id !== comp.draft);
      box.msgs.push(m); save(); hideCompose(); api.sfx.floppy ? api.sfx.floppy() : api.sfx.click();
      if (fromButton) note(`Saved in Drafts.${m.masked ? ' Some words or personal details were hidden to keep you safe.' : ''}`, [['Open Drafts', () => go('drafts')]], 5000);
      render();
    }
    function sendComposed() {
      if (!comp) return;
      const { to, tx } = comp.els;
      const parts = to.value.split(/[,;]/).map(x => x.trim()).filter(Boolean);
      if (!parts.length || parts.some(x => !EMAIL_RE.test(x))) {
        api.msgBox(NAME, 'Please type an e-mail address in the To box, like ' + P.pal.addr + '. Tip: start typing a name to pick someone from your Address Book.', ['OK'], 'warn').then(() => { if (comp) to.focus(); });
        return;
      }
      if (!tx.value.trim() && !comp.quote) { api.msgBox(NAME, 'Your message is empty. Write something first!', ['OK'], 'info').then(() => { if (comp) tx.focus(); }); return; }
      const online = api.online();
      const m = buildMsg('outbox');
      if (comp.draft) box.msgs = box.msgs.filter(x => x.id !== comp.draft);
      box.msgs.push(m); save(); hideCompose();
      const safe = m.masked ? ' To keep you safe, some words or personal details were hidden.' : '';
      if (online) {
        busy = true; modemSound();
        const d = dialog(NAME, `<div class="hm-dl"><p>Sending message...</p><div class="hm-bar"><i></i></div></div>`);
        const bar = d.querySelector('.hm-bar i'); later(30, () => { bar.style.width = '100%'; });
        later(E === '2000' ? 700 : 1200, () => {
          busy = false; closeDialog(); deliver(m); api.sfx.sent();
          note('Message sent (pretend: it stays on this computer).' + safe, [], 6000); render();
        });
      } else {
        api.sfx.click();
        note('You\'re offline, so your message is waiting in the Outbox. Connect, then click Send and Receive.' + safe, [['Connect', () => api.openApp('dial')]], 12000);
      }
      render();
    }

    /* ---------- actions ---------- */
    function go(f) { cur = f; sel = null; R.classList.remove('hm-reading'); if (f === 'inbox') syncJobs(); render(); listEl.scrollTop = 0; }
    function select(id, show) {
      const m = byId(id); if (!m) return;
      sel = id;
      if (!m.read) { m.read = true; save(); }
      if (show) R.classList.add('hm-reading');
      render();
      const row = listEl.querySelector(`[data-id="${id}"]`); if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }
    const current = () => sel && byId(sel);
    function quoteOf(m) {
      return `----- Original Message -----\nFrom: ${who(m.from)}\nTo: ${m.to || ''}\nSent: ${longDate(m.ts)}\nSubject: ${m.subj || ''}\n\n${m.body || ''}${m.quote ? '\n\n' + m.quote : ''}`.slice(0, 2500);
    }
    function reply() {
      const m = current(); if (!m) return;
      if (m.f === 'drafts') { editDraft(m); return; }
      const mine = m.from && m.from.addr === me();
      compose({ to: mine ? m.to : m.from.addr, subj: 'Re: ' + (stripRe(m.subj) || ''), quote: quoteOf(m), rt: m.job || null, title: 'Re: ' + (stripRe(m.subj) || '(no subject)') });
    }
    async function forward() {
      const m = current(); if (!m) return;
      if (m.spam) {
        const r = await api.msgBox(NAME, 'This is a chain letter. Forwarding it just fills up your friends\' mailboxes, and nothing bad happens if you don\'t. Forward it anyway?', ['Delete it', 'Forward anyway', 'Cancel'], 'warn');
        if (closed) return;
        if (r === 'Delete it') { del(); return; }
        if (r !== 'Forward anyway') return;
      }
      compose({ subj: 'Fw: ' + (stripRe(m.subj) || ''), quote: quoteOf(m).replace('Original Message', 'Forwarded Message'), title: 'Fw: ' + (stripRe(m.subj) || '(no subject)') });
    }
    function editDraft(m) {
      compose({ to: m.to, subj: m.subj, body: m.body, quote: m.quote, rt: m.rt, draft: m.id, title: 'Draft: ' + (m.subj || '(no subject)') });
    }
    async function del() {
      const m = current(); if (!m) return;
      const list = inFolder(cur), i = list.findIndex(x => x.id === m.id);
      if (m.f === 'trash') {
        const r = await api.msgBox(NAME, 'Delete this message forever?', ['Yes', 'No'], 'warn');
        if (r !== 'Yes' || closed) return;
        box.msgs = box.msgs.filter(x => x.id !== m.id);
      } else { m.was = m.f; m.f = 'trash'; }
      api.sfx.click(); save();
      const next = list[i + 1] || list[i - 1];
      sel = next && next.id !== m.id ? next.id : null;
      if (!sel) R.classList.remove('hm-reading');
      render();
    }
    function restore() { const m = current(); if (!m) return; m.f = m.was && CAP[m.was] ? m.was : 'inbox'; delete m.was; save(); sel = null; R.classList.remove('hm-reading'); render(); note(`Moved back to ${fname(m.f)}.`, [], 4000); }
    async function emptyTrash() {
      const n = inFolder('trash').length;
      if (!n) { note('The trash is already empty.', [], 3000); return; }
      const r = await api.msgBox(NAME, `Delete the ${n} message${n === 1 ? '' : 's'} in the trash forever?`, ['Yes', 'No'], 'warn');
      if (r !== 'Yes' || closed) return;
      box.msgs = box.msgs.filter(m => m.f !== 'trash'); save(); if (cur === 'trash') sel = null; render();
    }
    function markAll() { box.msgs.forEach(m => { if (m.f === 'inbox') m.read = true; }); save(); render(); }
    function markUnread() { const m = current(); if (m && m.f === 'inbox') { m.read = false; save(); render(); } }
    function howTo() {
      api.msgBox(`${NAME} Help`, `${NAME} is a pretend e-mail program. Nothing you write ever leaves this computer, and everyone who writes back is a made-up character.\n\nRead: click a folder, then a message.\nWrite: click New, type an address in To (or start typing a name to pick from your Address Book), a Subject and your message, then click Send.\nReply or Forward: pick a message first.\nSend and Receive: connect with the modem first. Messages you send while offline wait in the Outbox.\nWork Center jobs: job e-mails show a JOB tag. Reply to one to finish the job.\nJunk mail: chain letters are spam. Just delete them.\n\nTo keep you safe, bad words and personal details like phone numbers are hidden automatically.`);
    }

    // clicks
    R.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'); if (f && foldEl.contains(f)) { api.sfx.click(); go(f.dataset.f); return; }
      const row = e.target.closest('.hm-row'); if (row) { select(row.dataset.id, true); return; }
      const a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
      const act = a.dataset.a;
      if (act === 'new') compose();
      else if (act === 'reply') reply();
      else if (act === 'fwd') forward();
      else if (act === 'del') del();
      else if (act === 'sr') sendReceive();
      else if (act === 'ab') go('ab');
      else if (act === 'back') { R.classList.remove('hm-reading'); }
      else if (act === 'edit') { const m = current(); if (m) editDraft(m); }
      else if (act === 'restore') restore();
      else if (act === 'write') compose({ to: a.dataset.addr });
      else if (act === 'rmc') { box.contacts = box.contacts.filter(c => c.addr !== a.dataset.addr); save(); render(); }
    });
    listEl.addEventListener('dblclick', e => { const row = e.target.closest('.hm-row'); if (!row) return; const m = byId(row.dataset.id); if (m && m.f === 'drafts') editDraft(m); });
    listEl.addEventListener('keydown', e => { const row = e.target.closest('.hm-row'); if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(row.dataset.id, true); } });

    W.onKey = e => {
      if (comp) {
        if (e.key === 'Escape' && comp.els.sug.hidden) { e.preventDefault(); closeCompose(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendComposed(); }
        return;
      }
      if (!dov.hidden) { if (e.key === 'Escape' && !busy) closeDialog(); return; }
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (cur === 'ab') return;
      const list = inFolder(cur); if (!list.length && e.key !== 'F5') return;
      const i = list.findIndex(m => m.id === sel);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = list[Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))] || list[0]; select(n.id, false); }
      else if (e.key === 'Delete') { e.preventDefault(); del(); }
      else if (e.key === 'F5') { e.preventDefault(); sendReceive(); }
      else if (e.key === 'Escape' && R.classList.contains('hm-reading')) { R.classList.remove('hm-reading'); }
    };

    api.menubar([
      { label: 'File', items: () => [{ label: 'New Message', fn: () => compose() }, { label: 'Send and Receive', fn: sendReceive }, '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Edit', items: () => [
        { label: 'Mark as Unread', fn: markUnread, disabled: !current() || current().f !== 'inbox' },
        { label: 'Mark All as Read', fn: markAll },
        '-',
        { label: 'Address Book', fn: () => go('ab') },
        { label: 'Empty Trash', fn: emptyTrash }] },
      { label: 'Message', items: () => [
        { label: 'Reply', fn: reply, disabled: !current() || cur === 'ab' },
        { label: 'Forward', fn: forward, disabled: !current() || cur === 'ab' },
        { label: 'Delete', fn: del, disabled: !current() || cur === 'ab' }] },
      { label: 'Help', items: [{ label: `How to use ${NAME}`, fn: howTo }, { label: `About ${NAME}`, fn: () => api.msgBox(`About ${NAME}`, `${NAME}\n${E === '2000' ? 'Horizon 2000 edition' : 'Horizon 95 edition'}\n\nYour address: ${me()}\n\nThis is pretend e-mail. Messages stay on this computer.`) }] }
    ]);

    W.onNet = () => {
      if (closed) return;
      render();
      if (api.online()) {
        const n = inFolder('outbox').length;
        if (n) note(`You're connected! ${n} message${n === 1 ? ' is' : 's are'} waiting in your Outbox.`, [['Send and Receive', sendReceive]], 12000);
        checkPending(false);
      }
    };
    W.onResize = () => { };
    const poll = setInterval(() => { if (closed) return; const n = syncJobs(); if (n) { notifyNew(n); render(); } checkPending(false); }, 30000);
    W.onClose = () => {
      if (comp && compDirty() && (comp.els.tx.value.trim() || comp.els.sj.value.trim())) { try { const m = buildMsg('drafts'); if (comp.draft) box.msgs = box.msgs.filter(x => x.id !== comp.draft); box.msgs.push(m); } catch (e) { } }
      closed = true; clearInterval(poll); clearTimeout(noteT); timers.forEach(clearTimeout); timers.clear();
      save();
    };

    // first look
    const newJobs = syncJobs();
    const firstPending = checkPending(true);
    save(); render();
    if (!api.online() && inFolder('outbox').length) note(`${inFolder('outbox').length} message(s) waiting in your Outbox. Connect, then click Send and Receive.`, [['Connect', () => api.openApp('dial')]], 10000);
    else if (newJobs + firstPending) notifyNew(newJobs + firstPending);
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'mail',
    get label() { return screenEra() === '2000' ? 'Inbox' : 'Horizon Mail'; },
    help: 'A pretend e-mail program: read mail, write to pen pals and answer Work Center job e-mails. Mail is pretend and stays on this computer.',
    kind: 'builtin', cat: 'main', eras: ['1995', '2000'],
    icon: ICON,
    window: { w: 720, h: 500 },
    css: CSS,
    open
  });
})();
