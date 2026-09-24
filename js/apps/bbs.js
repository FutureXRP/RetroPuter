/* Terminal: a built-in 1985 terminal program that dials three (fictional) bulletin board systems.
   Everything the BBS sends streams in letter by letter at the chosen speed (300 or 1,200 bps).
   Message boards, XMODEM downloads, a door game (Space Trader), sysop chat and bulletins. */
(function () {
  'use strict';

  const HANG = { hang: true };
  const DAILY_CAP = 5;

  /* ---------- shared content ---------- */
  const HISTORY = [
    ['What is a BBS?',
`BBS stands for Bulletin Board System.

A BBS is a computer, usually in somebody's
house, hooked up to a phone line with a
modem. You call it with YOUR computer and
your modem.

There is only one phone line, so only ONE
person can be on at a time. That's why you
sometimes get a busy signal!

On a BBS you can leave messages for other
callers, download programs, and play games.
The person who runs it is called the SYSOP,
short for SYStem OPerator.`],
    ['How BBSes got started',
`In January 1978 a huge blizzard buried
Chicago in snow. Two computer hobbyists,
Ward Christensen and Randy Suess, used the
snow days to build a computer version of
the cork bulletin board at their computer
club.

They called it CBBS, the Computerized
Bulletin Board System. It went online on
February 16, 1978.

Other people loved the idea, and soon
hobbyists all over the country were running
boards from their homes. Like this one!`],
    ['Modems and that screeching sound',
`MODEM is short for MOdulator-DEModulator.

Phone lines were built to carry voices, not
computer data. So a modem turns the
computer's 1s and 0s into sounds, and the
modem at the other end turns the sounds
back into data.

The screeching when you connect is the two
modems saying hello and agreeing how fast
to talk.

The first home modems were ACOUSTIC
COUPLERS: you pushed the telephone handset
into two rubber cups! They ran at 300 bits
per second. At 1,200 bits per second, about
120 letters arrive every second. Watch them
appear on your screen!`],
    ['What do AT commands mean?',
`Many modems understand the Hayes commands,
first sold on the Hayes Smartmodem in 1981.
Every command starts with AT, which stands
for ATtention.

  ATZ      reset the modem
  ATDT     Dial, using Tones
  +++      stop sending, listen to me
  ATH0     Hang up

So ATDT5551985 means: "Attention! Dial
555-1985 using touch tones."`],
    ['How downloads work: XMODEM',
`When you download a file here, it travels
with XMODEM, a way of sending files that
Ward Christensen wrote in 1977.

XMODEM sends a file in blocks of 128 bytes.
After every block the other computer checks
a number called a CHECKSUM. If it doesn't
match (maybe static on the line scrambled a
letter), it asks for that block again.

It's slow, but it gets there in the end.`],
    ['BBSes that talk to each other',
`In 1984 a network called FidoNet started
letting bulletin boards pass messages to
each other.

In the middle of the night, when long
distance phone calls are cheapest, boards
call each other and trade mail. A message
can hop across the country one phone call
at a time.`],
    ['Safety and good manners',
`1. NEVER give out your real address, phone
   number or password. Use a handle (a
   nickname) instead.
2. Be kind. There is a real person on the
   other end of every message.
3. DON'T TYPE IN ALL CAPITALS. IT LOOKS
   LIKE YOU ARE SHOUTING.
4. Keep your calls short so other people
   can get through.
5. Say thank you to your sysop. They pay
   for the phone line!`]
  ];

  const FUNNY_DROPS = [
    'Somebody in your house picked up the phone to call Grandma. The modem heard "HELLO? HELLO?" and got so confused it hung up.',
    'Your little brother picked up the kitchen phone to order a pizza. He heard screeching, yelled "IT\'S A ROBOT!" and hung up. So did your modem.',
    'Someone picked up the phone upstairs. In 1985, that\'s all it took to knock you offline!'
  ];

  const TIPS_ANY = [
    'That\'s neat!', 'Tell me more!', 'Ha! That\'s a good one.', 'Really? Wow.', 'I didn\'t know that.',
    'Hmm, let me think about that.', 'Cool beans.', 'You don\'t say!'
  ];

  const BBSES = [
    {
      id: 'prairie', name: 'The Prairie Dog BBS', short: 'Prairie Dog', phone: '555-1985', sysop: 'Dale', awake: 0.65,
      art:
String.raw`{b}      .--.
     ( oo )    THE PRAIRIE DOG
     /(__)\         B B S
    /  ||  \   ~~~~~~~~~~~~~~~~~~
 ~~~~~~~~~~~~~ {/}Sysop: Dale
               Running on an XT in
               Dale's basement
               One line - 24 hours
               {d}Since 1983{/}`,
      news: ['Dale\'s news',
`Howdy, callers!

The new 10 megabyte hard disk is in! That
is room for about 28 floppy disks' worth of
files. The file area is filling up fast.

Please keep calls under 30 minutes. It is
one phone line and a lot of you!

Space Trader high scores are on the door
menu. NIGHTOWL is still on top. Somebody
beat her, please.

  - Dale`],
      last: ['NIGHTOWL', 'PIXELPETE', 'MODEMMOM', 'GRANDPA_GUS', 'CAPT.FLOPPY', 'SPROCKET'],
      regulars: ['PIXELPETE', 'MODEMMOM', 'NIGHTOWL', 'SPROCKET', 'GRANDPA_GUS', 'CAPT.FLOPPY'],
      doors: ['trader'],
      files: [
        ['GAMES', 'TREKTRAD.ARC', 38912, 'Space trading game (shareware)'],
        ['GAMES', 'CHECKERS.ARC', 21504, 'Checkers vs. the computer'],
        ['TEXT', 'JOKES.TXT', 2304, 'Clean jokes from the callers'],
        ['TEXT', 'BBSLIST.TXT', 1664, 'Other boards to call'],
        ['TEXT', 'COOKIES.TXT', 1280, 'MODEMMOM\'s famous cookies'],
        ['UTIL', 'KALEIDO.BAS', 3200, 'Pretty patterns in BASIC']
      ],
      boards: [
        { name: 'General Chatter', threads: [
          ['Who keeps tying up the line?!', [
            ['NIGHTOWL', 'I tried to call 47 times last night. BUSY BUSY BUSY. Who is hogging the line?'],
            ['PIXELPETE', 'Um. Sorry. I was downloading a game. It took two hours. It was worth it.'],
            ['DALE', 'Friendly reminder: it\'s ONE phone line in my basement. 30 minutes per call, folks.']]],
          ['My mom picked up the phone', [
            ['LUNCHBOX', 'I was halfway through a download and my mom picked up the phone to call Aunt Ruth. Screech, garbage, NO CARRIER. Gone.'],
            ['MODEMMOM', 'As a mom, I apologize on behalf of all moms everywhere.'],
            ['CAPT.FLOPPY', 'Tape a sign on the phone: MODEM IN USE. It worked great until my little brother learned to read.']]],
          ['Best snack for computing?', [
            ['BYTE_BUSTER', 'Cheese puffs. The only downside is an orange keyboard.'],
            ['GRANDPA_GUS', 'Keep the crumbs out of your disk drive, young man.'],
            ['SPROCKET', 'Apple slices. Healthy AND no orange fingerprints.'],
            ['BYTE_BUSTER', 'Orange fingerprints are my signature.']]],
          ['Hello from a new user!', [
            ['SPROCKET', 'Hi everybody! I got a 1200 baud modem for my birthday. It is SO FAST.'],
            ['NIGHTOWL', 'Welcome! When I started I had 300 baud. I could read faster than it could type.'],
            ['DALE', 'Welcome aboard, Sprocket. Read the bulletins and have fun.']]],
          ['What will computers be like in 2000?', [
            ['THE_WIZ', 'My prediction: a whole MEGABYTE of memory, and flying cars.'],
            ['PIXELPETE', 'I bet computers will fit in your pocket and play music.'],
            ['LUNCHBOX', 'HA! Get real, Pete. A computer in your POCKET?'],
            ['MODEMMOM', 'I just hope they\'re easier to set up.']]],
          ['LOST: one floppy disk', [
            ['CAPT.FLOPPY', 'Has anyone seen a floppy labeled HOMEWORK - DO NOT ERASE? I think my dog ate it.'],
            ['GRANDPA_GUS', 'Check the refrigerator door. And keep it away from magnets! A magnet can erase a floppy.'],
            ['CAPT.FLOPPY', 'Found it under the fridge magnet. It\'s blank now. Grandpa Gus, you are wise.']]],
          ['Does anyone talk to their computer?', [
            ['LUNCHBOX', 'I say "come on, come on, COME ON" while programs load. It doesn\'t help.'],
            ['SPROCKET', 'I say please. I figure it can\'t hurt.'],
            ['THE_WIZ', 'Mine never answers. So rude.']]],
          ['Snow day!', [
            ['GRANDPA_GUS', 'Six inches of snow out here. Perfect day to stay in and read the message boards.'],
            ['MODEMMOM', 'The kids built a snowman and named it SYSOP.'],
            ['DALE', 'I\'m honored. Mine is the one with the carrot, right?']]],
          ['Knock knock (clean jokes only!)', [
            ['BYTE_BUSTER', 'Knock knock. Who\'s there? Byte. Byte who? Byte me a sandwich, I\'m hungry.'],
            ['SPROCKET', 'Why was the computer cold? It left its Windows open! (I don\'t get it either, my uncle told me.)'],
            ['PIXELPETE', 'Why did the modem go to school? To improve its baud-cabulary.'],
            ['NIGHTOWL', 'Groan.']]]
        ] },
        { name: 'Computer Help Desk', threads: [
          ['What does "Bad command or file name" mean?', [
            ['SPROCKET', 'My computer keeps saying Bad command or file name. Is it mad at me?'],
            ['THE_WIZ', 'It means DOS didn\'t understand what you typed. Check your spelling. Type DIR to see what\'s there.'],
            ['SPROCKET', 'I typed PLEASE RUN MY GAME and it said it again.'],
            ['THE_WIZ', 'Politeness is not a DOS command. Yet.']]],
          ['300 or 1200 baud?', [
            ['LUNCHBOX', 'Is a 1200 baud modem really worth it?'],
            ['NIGHTOWL', 'It\'s four times faster. A 10K file takes almost 6 minutes at 300 and under a minute and a half at 1200.'],
            ['LUNCHBOX', 'Starting a lawn-mowing business TODAY.']]],
          ['How do I back up my hard disk?', [
            ['MODEMMOM', 'How do I back up my new 10 meg hard disk?'],
            ['GRANDPA_GUS', 'COPY your files onto floppies. A full 10 meg disk takes about 30 floppies.'],
            ['MODEMMOM', 'THIRTY? I\'d better buy stock in floppy disks.'],
            ['PIXELPETE', 'Label them! Otherwise you get 30 disks that all say STUFF.']]],
          ['Non-System disk or disk error', [
            ['CAPT.FLOPPY', 'My computer won\'t start. It says Non-System disk or disk error. Help!'],
            ['DALE', 'Is there a floppy in drive A? Take it out and press a key.'],
            ['CAPT.FLOPPY', 'That was it. I left my game disk in. Dale, you\'re a genius.'],
            ['DALE', 'I\'ve done it about four hundred times myself.']]],
          ['Is 640K of memory enough?', [
            ['THE_WIZ', 'My computer has 640K of memory. That\'s enough for anything, right?'],
            ['PIXELPETE', 'What would anybody DO with more than 640K?'],
            ['GRANDPA_GUS', 'My first computer had 4K. You kids are spoiled.']]],
          ['Spilled juice on my keyboard', [
            ['BYTE_BUSTER', 'Grape juice. Keyboard. Help.'],
            ['MODEMMOM', 'Unplug it, turn it upside down and let it dry for a day or two.'],
            ['BYTE_BUSTER', 'It works again! The J key is a little sticky. It smells like grapes.']]],
          ['My printer is LOUD', [
            ['SPROCKET', 'My new printer sounds like a robot with the hiccups. Is it broken?'],
            ['THE_WIZ', 'Nope, that\'s a dot matrix printer. It hammers tiny pins against a ribbon to make dots.'],
            ['SPROCKET', 'My cat has left the house.']]],
          ['WHY IS EVERYONE YELLING', [
            ['LUNCHBOX', 'EVERYBODY ON THIS BOARD IS SHOUTING AT ME'],
            ['NIGHTOWL', 'Lunchbox, your Caps Lock key is on.'],
            ['LUNCHBOX', 'oh. sorry everyone. this is much calmer.']]],
          ['What is a sysop?', [
            ['SPROCKET', 'Everybody keeps saying sysop. What is a sysop?'],
            ['GRANDPA_GUS', 'SYStem OPerator. The person who runs the BBS. Around here, that\'s Dale.'],
            ['DALE', 'I also fix the tractor, feed the cows, and reboot the BBS when it crashes. Mostly in that order.']]]
        ] },
        { name: 'Game Zone', threads: [
          ['Space Trader tips', [
            ['NIGHTOWL', 'Space Trader tip: robots are cheap on Cogsworth. Somebody out there pays a LOT for them.'],
            ['PIXELPETE', 'Watch out for asteroid storms. I lost half my ore.'],
            ['NIGHTOWL', 'And always count your fuel before you jump. I\'m not telling you anything else. I like being #1.']]],
          ['Stuck in a text adventure', [
            ['CAPT.FLOPPY', 'I\'ve been stuck in the same room of a text adventure since March.'],
            ['THE_WIZ', 'Did you try LOOK UNDER everything? And EXAMINE everything?'],
            ['CAPT.FLOPPY', 'I LOOKED UNDER THE RUG. IT\'S APRIL. I\'M FREE!']]],
          ['Mystery of Maple Manor (no spoilers!)', [
            ['SPROCKET', 'Anybody playing Mystery of Maple Manor? The grandfather clock in the hall is driving me nuts.'],
            ['MODEMMOM', 'No spoilers! But clocks need winding, and a key has to be SOMEWHERE in that house.'],
            ['SPROCKET', 'Also: is the ghost scary? My little sister wants to play.'],
            ['MODEMMOM', 'Not scary at all. My kids played it together. Tell her to read EVERYTHING.']]],
          ['My joystick broke', [
            ['BYTE_BUSTER', 'I pushed so hard during a racing game that the stick came right off.'],
            ['LUNCHBOX', 'Did you win at least?'],
            ['BYTE_BUSTER', 'I came in 8th out of 8. The stick came off on the first turn.']]],
          ['Typing in games from magazines', [
            ['PIXELPETE', 'I typed in a 12-page BASIC game from a magazine. It took all weekend.'],
            ['THE_WIZ', 'Did it work?'],
            ['PIXELPETE', 'Almost. One typo, and the spaceship is a smiley face now. I like it better actually.']]],
          ['Games on cassette tapes', [
            ['SPROCKET', 'My cousin loads games from cassette tapes. It takes 10 minutes and sounds like a robot singing.'],
            ['GRANDPA_GUS', 'And if somebody bumps the volume knob, you start all over.'],
            ['SPROCKET', 'Floppies are a miracle.']]],
          ['Checkers champion', [
            ['MODEMMOM', 'Downloaded CHECKERS.ARC from the file area. The computer beat me in 12 moves.'],
            ['LUNCHBOX', 'It beat me in 9.'],
            ['GRANDPA_GUS', 'I beat it. Then I beat it again. I have been playing checkers since 1931.']]],
          ['High score bragging thread', [
            ['NIGHTOWL', 'Space Trader: new high score. Come and get me.'],
            ['CAPT.FLOPPY', 'Worm on the 1990 computers? Oh wait, those don\'t exist yet.'],
            ['PIXELPETE', 'Floppy, are you a time traveler?'],
            ['CAPT.FLOPPY', '...no comment.']]]
        ] }
      ],
      chat: {
        page: 'Paging Dale',
        asleep: 'Dale is asleep. Farmers get up at 5 in the morning! Leave him a message and he\'ll read it at breakfast.',
        hi: 'Well howdy, {h}! Dale here. What can I do for you?',
        bye: 'Take care now, {h}. Say hi to your folks for me!',
        end: 'Oops, the cows are mooing for supper. Gotta run. Bye, {h}!',
        reply: 'Thanks for the note, {h}! It made my morning. Hope to see you on the boards. - Dale',
        say: {
          hello: ['Howdy!', 'Hi there, {h}!'],
          how: ['Doing fine, thanks. The hard disk is humming and the cows are happy.'],
          name: ['I\'m Dale. I run this BBS from my basement, between farm chores.'],
          age: ['Old enough to remember when a computer filled a whole room!'],
          where: ['Out on the prairie. More prairie dogs than people around here.'],
          game: ['Try Space Trader in the doors menu. Buy low, sell high. NIGHTOWL is the one to beat.'],
          modem: ['My modem is a 1200. Someday I want a 2400. Imagine that!'],
          joke: ['What do you call a cow with no legs? Ground beef. Ha! Sorry.', 'Why did the scarecrow win an award? He was outstanding in his field.'],
          school: ['Keep up with your homework. The BBS will still be here after.'],
          pet: ['We have a barn cat named Floppy. She sleeps on the warm modem.'],
          food: ['MODEMMOM\'s cookie recipe is in the file area. Highly recommended.'],
          help: ['Press M on the main menu for messages, F for files, D for games. G says goodbye.'],
          thanks: ['You\'re welcome!', 'Anytime, {h}.'],
          question: ['Good question! Let me scratch my head on that one.', 'Hmm. I\'d ask Grandpa Gus. He knows everything.']
        }
      }
    },
    {
      id: 'kevin', name: 'Kevin\'s Kitchen Table BBS', short: 'Kevin\'s BBS', phone: '555-0412', sysop: 'Kevin', awake: 0.5, busy: true,
      art:
String.raw`{b}  KEVIN'S KITCHEN TABLE BBS!!!{/}
   _________________________
  /________________________/|
  |   [==]  <-- our       | |
  |   /__\     computer!  | |
  |_______________________|/
   ||                   ||
  {d}Sysops: Kevin (age 7) and Dad{/}`,
      news: ['News from Kevin',
`HI!!! I AM KEVIN. I AM 7.

My dad says I have to stop typing in all
capitals. ok.

This BBS is on our kitchen table. When
Mom needs the phone, the BBS goes off.
Sorry if it is busy a lot.

We got a new dinosaur board. Stegosaurus
is the best. Dad says that is my opinion.

bye!!!
  - Kevin

p.s. Dad here. Thanks for calling and for
being nice to Kevin. - Kevin's Dad`],
      last: ['GRANDPA_GUS', 'TRICERATOPS', 'KEVINS_DAD', 'MODEMMOM', 'SPROCKET'],
      regulars: ['TRICERATOPS', 'GRANDPA_GUS', 'SPROCKET', 'MODEMMOM'],
      doors: ['guess', 'trader'],
      files: [
        ['KEVIN', 'DINOS.TXT', 1536, 'Kevin\'s dinosaur facts'],
        ['KEVIN', 'JOKES2.TXT', 1152, 'Jokes Kevin thinks are funny'],
        ['GAMES', 'TREKTRAD.ARC', 38912, 'Space trading game (shareware)']
      ],
      boards: [
        { name: 'Dinosaur Club', threads: [
          ['Best dinosaur', [
            ['KEVIN', 'stegosaurus is the best. it has plates on its back and spikes on its tail.'],
            ['TRICERATOPS', 'Triceratops has THREE horns. I rest my case.'],
            ['KEVIN', 'you only picked that because it is your name'],
            ['TRICERATOPS', 'Yes.']]],
          ['How big was the biggest dinosaur?', [
            ['SPROCKET', 'How big were the biggest ones?'],
            ['KEVINS_DAD', 'The long-necked plant eaters were the giants. Some were longer than a school bus. Much longer.'],
            ['KEVIN', 'i would ride one to school']]],
          ['Did dinosaurs roar?', [
            ['KEVIN', 'did dinosaurs roar like in movies'],
            ['GRANDPA_GUS', 'Nobody knows for sure, Kevin! Sounds don\'t leave fossils.'],
            ['KEVIN', 'i think they said HONK']]],
          ['My dinosaur drawing', [
            ['KEVIN', 'i drew a t rex on the computer with dots. it looks like a potato with legs'],
            ['MODEMMOM', 'A potato with legs is a great start, Kevin!']]],
          ['Fossil hunting', [
            ['GRANDPA_GUS', 'Found a fossil shell in the creek bed today. It\'s older than me, if you can believe it.'],
            ['KEVIN', 'nothing is older than you grandpa gus'],
            ['KEVINS_DAD', 'KEVIN.'],
            ['GRANDPA_GUS', 'Ha! Fair enough.']]]
        ] },
        { name: 'Jokes & Riddles', threads: [
          ['What do you call a sleeping dinosaur?', [
            ['KEVIN', 'what do you call a sleeping dinosaur'],
            ['KEVIN', 'a dino-SNORE!!!!!!'],
            ['TRICERATOPS', 'Kevin you can\'t answer your own joke'],
            ['KEVIN', 'i just did']]],
          ['Why did the cookie go to the doctor?', [
            ['SPROCKET', 'Why did the cookie go to the doctor? Because it felt crummy.'],
            ['KEVIN', 'HAHAHAHAHA']]],
          ['Riddle time', [
            ['KEVINS_DAD', 'What has keys but can\'t open locks?'],
            ['KEVIN', 'a computer!!!'],
            ['KEVINS_DAD', 'Also a piano. Good answer though.']]],
          ['Knock knock', [
            ['KEVIN', 'knock knock'],
            ['MODEMMOM', 'Who\'s there?'],
            ['KEVIN', 'interrupting cow'],
            ['MODEMMOM', 'Interrupting c-'],
            ['KEVIN', 'MOO']]],
          ['Why is 6 afraid of 7?', [
            ['TRICERATOPS', 'Why is 6 afraid of 7? Because 7 8 9.'],
            ['KEVIN', 'i am 7. i did not eat anybody']]]
        ] },
        { name: 'Pet Parade', threads: [
          ['My hamster escaped', [
            ['KEVIN', 'my hamster nibbles got out. if you see a hamster tell me'],
            ['KEVINS_DAD', 'Update: Nibbles was in the sock drawer. Everyone is fine.']]],
          ['Do cats like computers?', [
            ['SPROCKET', 'My cat sleeps on top of the monitor. It\'s warm.'],
            ['MODEMMOM', 'Ours sat on the keyboard and typed ;;;;;;;;;;;;;;;;; in my letter.']]],
          ['Best pet name', [
            ['KEVIN', 'best pet names: nibbles, sir barks a lot, floppy, and potato'],
            ['GRANDPA_GUS', 'I had a dog named Biscuit. Good dog.']]],
          ['My dog vs the modem', [
            ['TRICERATOPS', 'Every time the modem screeches my dog howls along.'],
            ['KEVIN', 'he is singing the modem song']]],
          ['Goldfish facts', [
            ['KEVINS_DAD', 'Kevin wants everyone to know his goldfish is named Captain.'],
            ['KEVIN', 'he is the captain of the fish bowl']]]
        ] }
      ],
      chat: {
        page: 'Paging Kevin',
        asleep: 'Kevin is asleep. It is past his bedtime! Dad says leave a message and Kevin will read it after school.',
        hi: 'HI {H}!!! it is kevin. dad is helping me type.',
        bye: 'bye {h}!!! call again ok',
        end: '[DAD]: Okay, bedtime, buddy. Say bye! ... bye {h}!!!',
        reply: 'hi {h} thank you for the message!!! i read it at breakfast. from kevin (and dad)',
        say: {
          hello: ['hi!!!', 'HELLO {H}'],
          how: ['i am good. i had a popsicle'],
          name: ['i am kevin. i am 7. i run this bbs with my dad'],
          age: ['i am 7 and a half'],
          where: ['on the kitchen table. mom says we have to move it at dinner'],
          game: ['play guess my number in the door games!!! i made it (dad helped)'],
          modem: ['our modem makes a funny noise. i call it the robot song'],
          joke: ['what do you call a sleeping dinosaur? a dino-snore!!!', 'why did the banana go to the doctor? it was not peeling well'],
          school: ['i am in second grade. i like recess and computers'],
          pet: ['my hamster is named nibbles. he escaped once'],
          food: ['my favorite food is pizza. and popsicles'],
          help: ['press G to say goodbye. press M for the messages. dad says that is right'],
          thanks: ['you are welcome!!!'],
          question: ['i dont know. DAD!!!', '[DAD]: Good question. Kevin says "maybe."'],
          dino: ['STEGOSAURUS!!!!!!', 'did you know stegosaurus had a tiny brain? like a walnut. dad says kind of']
        }
      }
    },
    {
      id: 'galaxy', name: 'Galaxy Nine', short: 'Galaxy Nine', phone: '555-9999', sysop: 'Commander Nova', awake: 0.7,
      art:
String.raw`{d} *     .        *      .      *{/}
{b}      .   _____        G A L A X Y
  *     ,'  .  '.   .     N I N E
 -----(--- o ----)-------------- {/}
   .   '._____.'  {d}the sci-fi BBS{/}
 {d}*        .      *     .     *   .{/}
      Sysop: Commander Nova`,
      news: ['Transmission from the Commander',
`Greetings, space cadets!

Halley's Comet is heading our way. It will
be closest to the Sun in February 1986.
Get your telescopes ready!

The Space Trader galaxy has been updated.
Pilots report asteroid storms near Ferrous.

Remember the Galaxy Nine rule: be kind to
every life form, including new users.

  - Commander Nova`],
      last: ['STARGAZER', 'ROCKETGIRL', 'NIGHTOWL', 'ZORB_42', 'PIXELPETE'],
      regulars: ['STARGAZER', 'ROCKETGIRL', 'ZORB_42', 'NIGHTOWL'],
      doors: ['trader'],
      files: [
        ['GAMES', 'TREKTRAD.ARC', 38912, 'Space trading game (shareware)'],
        ['SPACE', 'PLANETS.TXT', 1920, 'Planet facts for space cadets'],
        ['SPACE', 'STARMAP.BAS', 5760, 'Draws the night sky in BASIC'],
        ['TEXT', 'STORY9.TXT', 2560, 'The Galaxy Nine group story']
      ],
      boards: [
        { name: 'Starport Lounge', threads: [
          ['Best name for a robot', [
            ['ROCKETGIRL', 'I\'m building a (cardboard) robot. What should I name it?'],
            ['ZORB_42', 'BEEP-BOOP 3000'],
            ['STARGAZER', 'Sir Clanks-a-Lot'],
            ['ROCKETGIRL', 'Sir Clanks-a-Lot it is. He is very noble.']]],
          ['If you could visit any planet', [
            ['STARGAZER', 'I\'d visit Saturn. Well, near Saturn. It\'s mostly gas, so you can\'t stand on it.'],
            ['ZORB_42', 'I would visit my home planet. Which is definitely not a real planet called Zorb.'],
            ['ROCKETGIRL', 'Zorb, are you an alien?'],
            ['ZORB_42', 'beep. i mean. no.']]],
          ['Aliens in my backyard?', [
            ['ZORB_42', 'Weird lights in the sky last night!'],
            ['STARGAZER', 'That was probably the planet Venus. It\'s very bright near sunset and sunrise.'],
            ['ZORB_42', 'Hi, Venus! I have been waving at you for an hour.']]],
          ['Space food', [
            ['ROCKETGIRL', 'Astronauts eat freeze-dried ice cream. I tried some at a museum. It crunches!'],
            ['NIGHTOWL', 'Crunchy ice cream is wrong and I refuse to accept it.']]],
          ['My model rocket', [
            ['ROCKETGIRL', 'My model rocket went so high we lost it!'],
            ['STARGAZER', 'Did the parachute open?'],
            ['ROCKETGIRL', 'Yes. It landed in Mr. Peterson\'s pool. He is not a space fan.']]],
          ['Hello from Earth', [
            ['PIXELPETE', 'Hi, I also call the Prairie Dog BBS. Is this the place with the space jokes?'],
            ['COMMANDER', 'How do you throw a party in space? You planet! Welcome aboard, Pete.']]]
        ] },
        { name: 'Science & Space', threads: [
          ['Halley\'s Comet is coming!', [
            ['STARGAZER', 'Halley\'s Comet comes back about every 76 years. Last time was 1910!'],
            ['ROCKETGIRL', 'My great-grandma saw it in 1910. She says it looked like a smudge with a tail.'],
            ['COMMANDER', 'It will be closest to the Sun in February 1986. Look for it with binoculars!']]],
          ['How far away is the Moon?', [
            ['ZORB_42', 'How far is the Moon?'],
            ['STARGAZER', 'About 239,000 miles on average. Light from the Moon takes a bit more than 1 second to reach us.'],
            ['ZORB_42', 'At 1200 baud, how long to send a message there?'],
            ['STARGAZER', 'The signal is fast. It\'s the TYPING that\'s slow.']]],
          ['The Space Shuttle', [
            ['ROCKETGIRL', 'The Space Shuttle Columbia first flew in April 1981. It lands on a runway like an airplane!'],
            ['NIGHTOWL', 'And they use it again and again. Earlier spacecraft were only used once.']]],
          ['Voyager visits the planets', [
            ['STARGAZER', 'Voyager 1 flew past Saturn in 1980, and Voyager 2 in 1981.'],
            ['COMMANDER', 'Voyager 2 is on its way to Uranus now. It should get there in January 1986.'],
            ['ZORB_42', 'Say hi to Uranus for me, Voyager.']]],
          ['First American woman in space', [
            ['ROCKETGIRL', 'Sally Ride flew on the Space Shuttle in 1983. First American woman in space!'],
            ['STARGAZER', 'She was a physicist too. Science is a great way to get to space.'],
            ['ROCKETGIRL', 'Adding PHYSICS to my list. Right under ROCKETS.']]],
          ['Why is space dark?', [
            ['ZORB_42', 'If the Sun is so bright, why is space dark?'],
            ['STARGAZER', 'On Earth, the air scatters sunlight and the whole sky glows blue. Space has no air, so the sky stays black, even in daytime.'],
            ['ZORB_42', 'My mind is blown.']]]
        ] },
        { name: 'Story Station', threads: [
          ['Group story: The Lost Spaceship', [
            ['COMMANDER', 'Everyone adds one line. Captain Pip woke up. The spaceship was very, very quiet.'],
            ['ROCKETGIRL', 'Too quiet. Even the robot wasn\'t humming.'],
            ['ZORB_42', 'Then the robot said: "I have eaten all the space cookies."'],
            ['STARGAZER', 'Captain Pip sighed. "That is the third time this week, Sir Clanks-a-Lot."']]],
          ['Story: The Moon Cat', [
            ['NIGHTOWL', 'Once there was a cat who lived on the Moon. She wasn\'t lonely, because every night she watched Earth rise.'],
            ['ROCKETGIRL', 'Her favorite snack was moon cheese. It is not real cheese. She knew that. She didn\'t care.']]],
          ['Story: Robot Soccer', [
            ['ZORB_42', 'The robots played soccer on Mars. The ball kept floating away because gravity is weaker there.'],
            ['STARGAZER', 'Mars gravity is about a third of Earth\'s, so they could kick it really far!'],
            ['ZORB_42', 'Final score: 0 to 0. Both teams were still looking for the ball.']]],
          ['Story: The Friendly Asteroid', [
            ['ROCKETGIRL', 'Asteroid 9 wanted a friend, so it followed a spaceship for a hundred years.'],
            ['COMMANDER', 'The spaceship\'s pilot finally waved. The asteroid was so happy it spun for a week.']]],
          ['Write a space poem', [
            ['STARGAZER', 'Twinkle twinkle, 1200 baud. My screen is slow, but I\'m not bored.'],
            ['NIGHTOWL', 'Roses are red, Mars is red too, the rest of the planets are mostly not blue.'],
            ['ZORB_42', 'Beep. Boop. Poem. (I tried.)']]]
        ] }
      ],
      chat: {
        page: 'Hailing Commander Nova',
        asleep: 'The Commander is in hypersleep (asleep). Leave a transmission and it will be answered at the next shift.',
        hi: 'Greetings, space cadet {h}! Commander Nova on the line. Report!',
        bye: 'Commander Nova signing off. Live long and-- er, have a great day, {h}!',
        end: 'Incoming transmission from Mission Control (my mom): dinner is ready. Nova out! Bye, {h}!',
        reply: 'Transmission received, cadet {h}! Thank you for your message. See you among the stars. - Commander Nova',
        say: {
          hello: ['Greetings, earthling!', 'Hello, cadet {h}!'],
          how: ['All systems go! Shields at full power.'],
          name: ['I am Commander Nova, keeper of Galaxy Nine. Also a high school science teacher.'],
          age: ['Old enough to have watched the Moon landing on TV in 1969!'],
          where: ['Somewhere in the Milky Way. More exactly: a spare bedroom.'],
          game: ['Space Trader is in the doors. Watch for events on arrival. A good captain reads every message.'],
          modem: ['My modem is 1200 baud. That is 120 characters per second. Warp speed!'],
          joke: ['How does the Moon cut its hair? Eclipse it!', 'Why did the star go to school? To get brighter!'],
          school: ['Learn your science and math. Every astronaut did!'],
          pet: ['I have a goldfish named Nebula. She is a very good swimmer.'],
          food: ['Freeze-dried ice cream: crunchy, sweet, and very space-age.'],
          help: ['Main menu: M for messages, F for files, D for doors, G for goodbye. Engage!'],
          thanks: ['You are most welcome, cadet.'],
          question: ['A good question for the science board! Post it there.', 'Hmm. Let me consult the star charts.'],
          space: ['Did you know Saturn\'s rings are made of ice and rock?', 'Jupiter is so big that all the other planets could fit inside it.']
        }
      }
    }
  ];
  const BY_ID = Object.fromEntries(BBSES.map(b => [b.id, b]));

  const TEXTFILES = {
    'JOKES.TXT': `JOKES FROM THE PRAIRIE DOG BBS\n\nWhat do you call a computer that sings?\nA Dell... no wait, a Disk-O machine.\n\nWhy did the floppy disk go to the doctor?\nIt had a bad sector.\n\nWhat did the modem say to the phone?\n"Screeeeech." (It's not very polite.)\n\nWhat's a prairie dog's favorite game?\nHide and go squeak.`,
    'BBSLIST.TXT': `BOARDS TO CALL\n\nThe Prairie Dog BBS    555-1985  24 hrs\nKevin's Kitchen Table  555-0412  (busy!)\nGalaxy Nine            555-9999  sci-fi\n\nBe nice to your sysops!`,
    'COOKIES.TXT': `MODEMMOM'S FAMOUS OATMEAL COOKIES\n(Ask a grown-up to help with the oven!)\n\n1 cup butter, softened\n1 cup brown sugar\n2 eggs\n1 tsp vanilla\n1 1/2 cups flour\n1 tsp baking soda\n3 cups oats\n1 cup raisins or chocolate chips\n\nMix, drop by spoonfuls, bake at 350 F\nfor about 10 to 12 minutes.\nKeep crumbs away from the keyboard.`,
    'DINOS.TXT': `KEVINS DINOSAUR FACTS\n\n1. stegosaurus had plates on its back.\n2. triceratops had 3 horns.\n3. some dinosaurs had feathers!\n4. dinosaurs laid eggs.\n5. the dinosaurs lived a very very long\n   time ago, way before people.\n\nthe end. by kevin`,
    'JOKES2.TXT': `JOKES BY KEVIN\n\nwhat do you call a sleeping dinosaur?\na dino-snore!!!\n\nwhat is a cats favorite color?\npurr-ple!!!\n\nwhy did the kid bring a ladder to school?\nbecause it was HIGH school\n\n(dad says that one is from him)`,
    'PLANETS.TXT': `PLANET FACTS FOR SPACE CADETS\n\nMercury  closest to the Sun\nVenus    hottest planet, thick clouds\nEarth    home! mostly covered in water\nMars     the red planet, has big volcanoes\nJupiter  biggest planet, has a Great\n         Red Spot (a giant storm)\nSaturn   famous rings of ice and rock\nUranus   tipped over on its side\nNeptune  deep blue, very windy\n\nPluto is out there too. It's tiny!`,
    'STORY9.TXT': `THE GALAXY NINE GROUP STORY (so far)\n\nCaptain Pip woke up. The spaceship was\nvery, very quiet. Too quiet. Then the\nrobot said: "I have eaten all the space\ncookies." Captain Pip sighed. "That is\nthe third time this week, Sir Clanks-a-\nLot."\n\nTO BE CONTINUED... by YOU!`
  };

  /* ---------- Space Trader data ---------- */
  const GOODS = [['Grain', 20], ['Water', 30], ['Ore', 60], ['Medicine', 120], ['Robots', 250]];
  const PLANETS = [
    { n: 'Terra Nova', d: 'farm world', x: 2, y: 2, f: [0.5, 1.0, 1.3, 1.1, 1.2] },
    { n: 'Ferrous', d: 'mining world', x: 7, y: 1, f: [1.4, 1.3, 0.5, 1.1, 0.9] },
    { n: 'Cogsworth', d: 'robot factories', x: 9, y: 4, f: [1.2, 1.1, 1.4, 1.0, 0.55] },
    { n: 'Aqualon', d: 'ocean world', x: 1, y: 7, f: [1.2, 0.4, 1.2, 0.7, 1.3] },
    { n: 'Glimmer', d: 'fancy resorts', x: 8, y: 8, f: [1.3, 1.5, 1.0, 1.3, 1.45] },
    { n: 'Frostbite', d: 'ice research base', x: 4, y: 10, f: [1.5, 0.6, 1.1, 1.5, 1.1] }
  ];
  const TRADER_TOP = [['NIGHTOWL', 21870], ['CAPT.FLOPPY', 16450], ['STARGAZER', 11120], ['SPROCKET', 6300], ['LUNCHBOX', 2850]];
  const START_CR = 1000, JUMPS = 30;

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="4" width="28" height="20" fill="#c0c0c0" stroke="#000"/><rect x="5" y="7" width="22" height="14" fill="#000"/><g fill="#3f6"><rect x="7" y="9" width="8" height="2"/><rect x="7" y="13" width="12" height="2"/><rect x="7" y="17" width="3" height="2"/><rect x="11" y="17" width="2" height="2"/></g><rect x="10" y="24" width="12" height="3" fill="#808080" stroke="#000"/><rect x="6" y="27" width="20" height="3" fill="#c0c0c0" stroke="#000"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'terminal',
    label: 'Terminal',
    kind: 'builtin',
    eras: ['1985'],
    cmd: 'TERMINAL',
    cat: 'acc',
    icon: ICON,
    window: { w: 660, h: 480 },
    css: `
      .bbs{position:absolute;inset:0;display:flex;flex-direction:column;background:#000;color:var(--phos,#33ff66);font-family:var(--dos);--bbsfs:18px;font-size:var(--bbsfs);line-height:1.25;text-shadow:0 0 5px color-mix(in srgb,var(--phos,#33ff66) 50%,transparent)}
      .bbs button{font:inherit;color:inherit;text-shadow:inherit}
      .bbs .bbs-scr{flex:1;min-height:0;overflow-y:auto;padding:6px 10px;white-space:pre-wrap;word-break:break-word;cursor:text}
      .bbs .bbs-b{font-weight:bold;text-shadow:0 0 8px var(--phos,#33ff66)}
      .bbs .bbs-d{opacity:.62}
      .bbs .bbs-r{background:var(--phos,#33ff66);color:#000;text-shadow:none}
      .bbs .bbs-cur{display:inline-block;width:.6em;height:1em;vertical-align:-.15em;background:var(--phos,#33ff66);animation:bbsblink 1s steps(1) infinite}
      @keyframes bbsblink{50%{opacity:0}}
      .bbs .bbs-in{display:inline-block;background:transparent;border:0;border-bottom:1px dashed var(--phos,#33ff66);color:inherit;font:inherit;padding:0 2px;margin:0;width:min(22ch,70%);outline:none;caret-color:var(--phos,#33ff66);text-shadow:inherit;box-shadow:none;border-radius:0}
      .bbs .bbs-keys{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:4px 6px;border-top:1px solid color-mix(in srgb,var(--phos,#33ff66) 45%,transparent)}
      .bbs .bbs-keys:empty{display:none}
      .bbs .bbs-keys button{background:#000;border:1px solid var(--phos,#33ff66);padding:4px 8px;min-height:40px;min-width:44px;cursor:pointer;font-size:.9em}
      .bbs .bbs-keys button b{background:var(--phos,#33ff66);color:#000;padding:0 3px;margin-right:4px;text-shadow:none}
      .bbs .bbs-keys button:hover,.bbs .bbs-keys button:focus-visible{background:color-mix(in srgb,var(--phos,#33ff66) 22%,#000);outline:none}
      .bbs .bbs-st{flex:none;background:var(--phos,#33ff66);color:#000;text-shadow:none;padding:1px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.9em}
      .bbs .bbs-dir{flex:1;min-height:0;overflow-y:auto;padding:8px 12px}
      .bbs .bbs-dir h2{font:inherit;margin:0 0 6px;background:var(--phos,#33ff66);color:#000;text-shadow:none;padding:0 6px;display:inline-block}
      .bbs .bbs-dir p{margin:.3em 0}
      .bbs .bbs-list{border:1px solid var(--phos,#33ff66);margin:6px 0 10px}
      .bbs .bbs-list button{display:grid;grid-template-columns:2ch 1fr auto;gap:10px;align-items:baseline;width:100%;text-align:left;background:#000;border:0;border-bottom:1px dashed color-mix(in srgb,var(--phos,#33ff66) 40%,transparent);padding:8px 8px;min-height:44px;cursor:pointer}
      .bbs .bbs-list button:last-child{border-bottom:0}
      .bbs .bbs-list button small{grid-column:2 / 4;opacity:.65;font-size:.85em}
      .bbs .bbs-list button.on,.bbs .bbs-list button:focus-visible{background:var(--phos,#33ff66);color:#000;text-shadow:none;outline:none}
      .bbs .bbs-spd{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}
      .bbs .bbs-spd button{background:#000;border:1px solid var(--phos,#33ff66);padding:4px 10px;min-height:40px;cursor:pointer}
      .bbs .bbs-spd button[aria-pressed=true]{background:var(--phos,#33ff66);color:#000;text-shadow:none}
      .bbs .bbs-help{border:1px dashed var(--phos,#33ff66);padding:6px 10px;margin-top:8px}
      .bbs .bbs-bar{display:inline-block;letter-spacing:0}
    `,
    open(W, api) {
      const $ = s => W.body.querySelector(s);
      W.body.innerHTML = `<div class="bbs">
        <div class="bbs-dir"></div>
        <div class="bbs-scr" hidden aria-live="off"></div>
        <div class="bbs-keys"></div>
        <div class="bbs-st"></div>
      </div>`;
      const root = $('.bbs'), dirEl = $('.bbs-dir'), scr = $('.bbs-scr'), keysEl = $('.bbs-keys'), stEl = $('.bbs-st');

      let baud = api.load('baud', 1200) === 300 ? 300 : 1200;
      let view = 'dir', sel = 0, showHelp = false;
      let online = false, dialing = false, dialCall = null, cur = null; // cur = { bbs, start, dropped, me }
      let busyRun = 0;
      let closed = false;

      /* ---------- sizing ---------- */
      function fit() {
        const w = root.clientWidth || 640;
        const fs = Math.max(13, Math.min(22, Math.floor(w / (44 * 0.6))));
        root.style.setProperty('--bbsfs', fs + 'px');
      }
      W.onResize = fit;
      const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(root);

      /* ---------- output: streams at the modem's speed ---------- */
      let q = [], waiters = [], budget = 0, lastT = performance.now(), node = null, nodeCls = null;
      const cps = () => baud / 10;
      function parse(text, cps0) {
        let cls = '';
        String(text).split(/(\{[bdr\/]\})/).forEach(tok => {
          const m = tok.match(/^\{([bdr\/])\}$/);
          if (m) { cls = m[1] === '/' ? '' : 'bbs-' + m[1]; return; }
          for (const ch of tok) q.push({ ch, cls, cps: cps0 });
        });
      }
      function emit(ch, cls) {
        if (ch === '\f') { scr.textContent = ''; node = null; return; }
        if (ch === '\x07') { api.tone(880, 0.12, { vol: 0.05 }); return; }
        if (!node || nodeCls !== cls || !node.isConnected) {
          const sp = document.createElement('span'); if (cls) sp.className = cls;
          sp.appendChild(document.createTextNode('')); scr.appendChild(sp);
          node = sp.firstChild; nodeCls = cls;
        }
        node.data += ch;
      }
      function trim() { while (scr.childNodes.length > 600) scr.firstChild.remove(); }
      function drained() { const w = waiters; waiters = []; w.forEach(f => f()); }
      function tick() {
        const now = performance.now(), dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
        if (!q.length) { budget = 0; return; }
        budget += (q[0].cps || cps()) * dt;
        let n = 0;
        while (budget >= 1 && q.length) { const c = q.shift(); emit(c.ch, c.cls); budget--; n++; if (q.length && q[0].cps !== c.cps) { budget = Math.min(budget, 1); } }
        if (n) { trim(); scr.scrollTop = scr.scrollHeight; }
        if (!q.length) drained();
      }
      const ticker = setInterval(tick, 25);
      function flush() {
        if (!q.length) return;
        const all = q; q = [];
        all.forEach(c => emit(c.ch, c.cls));
        trim(); scr.scrollTop = scr.scrollHeight;
        drained();
      }
      function stream(text, cps0) { parse(text, cps0); return new Promise(res => { if (!q.length) res(); else waiters.push(res); }); }
      function printNow(text) { parse(text); flush(); }

      /* ---------- cancellable waits: a hang-up rejects everything pending ---------- */
      const cancelers = new Set();
      const guard = p => new Promise((res, rej) => {
        const c = () => { cancelers.delete(c); rej(HANG); };
        cancelers.add(c);
        p.then(v => { if (cancelers.delete(c)) res(v); }, e => { if (cancelers.delete(c)) rej(e); });
      });
      const cancelAll = () => [...cancelers].forEach(c => c());
      const out = (t, c) => guard(stream(t, c));
      const pause = ms => guard(api.sleep(ms));

      /* ---------- input ---------- */
      let want = null, ahead = null, inEl = null, lineEv = null;
      function renderKeys(opts) {
        keysEl.innerHTML = '';
        (opts || []).forEach(([k, label]) => {
          const b = document.createElement('button');
          b.innerHTML = `<b>${api.esc(k === 'ENTER' ? 'Enter' : k)}</b>${api.esc(label || '')}`;
          b.onclick = () => { api.sfx.key(); pressed(k, true); };
          keysEl.appendChild(b);
        });
      }
      function answer(v) {
        const w = want; want = null;
        if (inEl) { inEl.remove(); inEl = null; }
        renderKeys(view === 'term' && online ? [] : null);
        if (w) w.res(v);
      }
      function key(opts, any) {
        return guard(new Promise(res => {
          want = { type: 'key', opts, any, res };
          const a = ahead; ahead = null;
          if (a && (any || opts.some(o => o[0] === a))) { want = null; res(a); return; }
          renderKeys(opts);
        }));
      }
      function line(o = {}) {
        return guard(new Promise(res => {
          want = { type: 'line', res, o };
          inEl = document.createElement('input');
          inEl.className = 'bbs-in'; inEl.maxLength = o.max || 40; inEl.spellcheck = false; inEl.autocomplete = 'off';
          inEl.setAttribute('aria-label', o.label || 'Type your answer');
          if (o.mask) inEl.type = 'password';
          if (ahead && ahead.length === 1) inEl.value = ahead; ahead = null;
          inEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); lineEv = e; submitLine(); }
            else if (e.key.length === 1 || e.key === 'Backspace') api.sfx.key();
          });
          scr.appendChild(inEl); node = null;
          scr.scrollTop = scr.scrollHeight;
          renderKeys([...(o.choices || []), ['ENTER', o.enterLabel || 'Send']]);
          setTimeout(() => inEl && inEl.focus({ preventScroll: true }), 20);
        }));
      }
      function submitLine(v) {
        if (!want || want.type !== 'line') return;
        const val = (v !== undefined ? v : inEl ? inEl.value : '').replace(/[{}]/g, '').slice(0, want.o.max || 40);
        printNow((want.o.mask ? '*'.repeat(val.length) : val) + '\n');
        answer(val.trim());
      }
      function pressed(k, tapped) {
        if (!want) return;
        if (want.type === 'line') {
          if (k === 'ENTER') submitLine(); else submitLine(k);
          return;
        }
        if (want.any || want.opts.some(o => o[0] === k)) answer(k);
        else if (!tapped) api.sfx.blip(220);
      }
      async function yesNo(prompt) {
        await out(prompt + ' {b}(Y/N){/} ');
        const k = await key([['Y', 'Yes'], ['N', 'No']]);
        printNow(k + '\n');
        return k === 'Y';
      }
      async function anyKey(msg = 'Press any key...') {
        await out(`{d}${msg}{/}`);
        await key([['ENTER', 'Continue']], true);
        printNow('\n');
      }
      async function menuKey(prompt, opts) {
        await out(prompt);
        const k = await key(opts);
        printNow(k + '\n');
        return k;
      }

      W.keepEsc = false;
      const openedAt = performance.now();
      W.onKey = e => {
        if (closed || performance.now() - openedAt < 400) return; // ignore the Enter that launched us
        const k = e.key;
        if (view === 'dir') {
          if (k === 'ArrowDown') { sel = (sel + 1) % BBSES.length; drawDir(); e.preventDefault(); }
          else if (k === 'ArrowUp') { sel = (sel + BBSES.length - 1) % BBSES.length; drawDir(); e.preventDefault(); }
          else if (k === 'Enter' || k === 'd' || k === 'D') { e.preventDefault(); dial(BBSES[sel]); }
          else if (/^[1-3]$/.test(k)) { e.preventDefault(); sel = +k - 1; dial(BBSES[sel]); }
          else if (k === 'b' || k === 'B' || k === 's' || k === 'S') { e.preventDefault(); setBaud(baud === 1200 ? 300 : 1200); }
          else if (k === 'h' || k === 'H' || k === '?' || k === 'F1') { e.preventDefault(); showHelp = !showHelp; drawDir(); }
          return;
        }
        if (k === 'Escape') {
          e.preventDefault();
          if (online || dialing) endCall(dialing ? 'cancel' : 'user');
          else if (want) answer('ESC');
          return;
        }
        if (e.target === inEl || e === lineEv) return; // the input handles its own typing
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const nk = k === 'Enter' ? 'ENTER' : k === ' ' ? 'SPACE' : k.length === 1 ? k.toUpperCase() : null;
        if (!nk) return;
        if (q.length) { e.preventDefault(); flush(); if (nk !== 'SPACE') ahead = nk; return; }
        if (!want) return;
        e.preventDefault();
        if (want.type === 'line') { inEl && inEl.focus(); if (nk.length === 1 && inEl) inEl.value += k; return; }
        pressed(nk === 'SPACE' ? ' ' : nk);
      };
      scr.addEventListener('pointerup', () => {
        if (getSelection().toString()) return;
        if (q.length) flush();
        if (inEl) inEl.focus({ preventScroll: true });
      });

      /* ---------- status line ---------- */
      const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      function status() {
        if (view === 'dir') { stEl.textContent = `OFFLINE | ${baud} 8-N-1 | 1-3 Dial  B Speed  H Help | Esc Exit`; return; }
        if (dialing) { stEl.textContent = `DIALING ${cur.bbs.phone} | ${baud} bps | Esc Cancel`; return; }
        if (online) {
          const used = (Date.now() - cur.start) / 1000, left = Math.max(0, cur.limit - used);
          stEl.textContent = `ONLINE ${baud} | ${cur.bbs.short} | Time left ${mmss(left)} | Esc Hang up`;
          return;
        }
        stEl.textContent = `OFFLINE | ${baud} 8-N-1 | Any key: directory`;
      }
      const clock = setInterval(() => {
        status();
        if (!online || !cur) return;
        const used = (Date.now() - cur.start) / 1000;
        if (used >= cur.limit) { endCall('time'); return; }
        // Very rarely, somebody in the house picks up the phone.
        if (!cur.dropped && !cur.xfer && used > 150 && !(want && want.type === 'line') && Math.random() < 0.0006) { cur.dropped = true; endCall('drop'); }
      }, 1000);

      /* ---------- dialing directory ---------- */
      function setBaud(v) { baud = v; api.save('baud', v); api.sfx.click(); if (view === 'dir') drawDir(); status(); }
      function drawDir() {
        const calls = api.load('users', {});
        dirEl.innerHTML = `<h2>HORIZON TERM 1.2</h2>
          <p>DIALING DIRECTORY. Pick a board to call.</p>
          <div class="bbs-list" role="list">${BBSES.map((b, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}"><span>${i + 1}</span><span>${api.esc(b.name)}</span><span>${b.phone}</span><small>${calls[b.id] ? `You are ${api.esc(calls[b.id].handle)} here. Calls: ${calls[b.id].calls}` : 'Never called'}${b.busy ? ' | often busy' : ''}</small></button>`).join('')}</div>
          <div class="bbs-spd"><span>Modem speed:</span><button data-b="300" aria-pressed="${baud === 300}">300 bps</button><button data-b="1200" aria-pressed="${baud === 1200}">1,200 bps</button><span>8-N-1</span></div>
          <p>Press <b>1</b>-<b>3</b> or tap a board to dial. <b>B</b> changes speed. <b>H</b> for help.</p>
          ${showHelp ? `<div class="bbs-help">
            <p>WHAT IS THIS? In 1985 there is no Web. To go "online", your computer's MODEM phones another computer: a BULLETIN BOARD SYSTEM (BBS), often in someone's house.</p>
            <p>Once connected, everything arrives letter by letter. At 1,200 bps that's about 120 letters a second; at 300 bps only 30. Press any key to skip ahead.</p>
            <p>On the BBS, press the letter in [brackets] to pick a menu item. Press Esc to hang up.</p>
            <p>Leave your first message of the day to earn $1, and finish a Space Trader game with a profit to earn $2 (up to $5 a day).</p>
          </div>` : '<p><button class="btn" data-h>What is a BBS?</button></p>'}`;
        dirEl.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { sel = +b.dataset.i; dial(BBSES[sel]); });
        dirEl.querySelectorAll('[data-b]').forEach(b => b.onclick = () => setBaud(+b.dataset.b));
        const hb = dirEl.querySelector('[data-h]'); if (hb) hb.onclick = () => { showHelp = true; drawDir(); };
      }
      function showDir() {
        view = 'dir'; online = false; dialing = false; cur = null; W.keepEsc = false;
        q = []; waiters = []; want = null; ahead = null; if (inEl) { inEl.remove(); inEl = null; }
        scr.hidden = true; dirEl.hidden = false; renderKeys(null);
        api.setTitle('Terminal');
        drawDir(); status();
        setTimeout(() => { const b = dirEl.querySelector('.bbs-list button.on'); b && b.focus({ preventScroll: true }); }, 30);
      }

      /* ---------- a call ---------- */
      async function dial(bbs) {
        if (view !== 'dir') return;
        api.sfx.click();
        view = 'term'; dirEl.hidden = true; scr.hidden = false; scr.textContent = ''; node = null;
        cur = { bbs, start: 0, limit: 30 * 60, dropped: false, xfer: false };
        dialing = true; W.keepEsc = true; status();
        api.setTitle('Terminal - ' + bbs.name);
        try {
          printNow(`{d}Horizon Term 1.2   ${baud} bps  8-N-1{/}\n\n`);
          await typeLocal('ATZ'); await pause(300); printNow('OK\n');
          await typeLocal('ATDT' + bbs.phone.replace('-', ''));
          const busy = bbs.busy && busyRun < 2 && Math.random() < 0.6;
          const c = api.dial(bbs.phone, st => {
            if (!dialing || /user name/i.test(st)) return;
            printNow(`{d}  ${st}{/}\n`);
            if (busy && /Ringing/.test(st)) { c.cancel(); }
          }, 'v22');
          dialCall = c;
          const ok = await guard(c.done);
          dialCall = null;
          if (busy || !ok) {
            if (!busy) throw HANG;
            busyRun++;
            for (let i = 0; i < 4; i++) { api.tone(480, 0.5, { at: i, vol: 0.05, type: 'sine' }); api.tone(620, 0.5, { at: i, vol: 0.05, type: 'sine' }); }
            await pause(3900);
            printNow('BUSY\n\n');
            printNow(`{d}${api.pick(['Kevin\'s mom is probably on the phone.', 'Somebody else is already on Kevin\'s BBS.', 'Kevin\'s dad might be calling Grandma.'])} Only one caller at a time! Try again in a minute.{/}\n\n`);
            dialing = false; status();
            await anyKey('Press any key for the dialing directory...');
            showDir();
            return;
          }
          busyRun = 0;
          dialing = false; online = true; cur.start = Date.now();
          printNow(baud === 1200 ? 'CONNECT 1200\n' : 'CONNECT\n');
          api.sfx.blip(1320);
          status();
          await pause(500);
          await runBBS(bbs);
          endCall('bye');
        } catch (e) {
          if (e !== HANG) { console.error(e); endCall('error'); }
        }
      }
      async function typeLocal(s) {
        for (const ch of s) { printNow(ch); api.sfx.key(); await pause(55); }
        printNow('\n');
      }
      function endCall(reason) {
        if (view !== 'term' || (!online && !dialing)) return;
        const wasOnline = online;
        online = false; dialing = false;
        cancelAll(); q = []; waiters = []; want = null; ahead = null;
        if (inEl) { inEl.remove(); inEl = null; }
        renderKeys(null);
        if (dialCall) { dialCall.cancel(); dialCall = null; }
        if (cur) cur.xfer = false;
        api.noise(0.05, { f: 700, vol: 0.12, decay: 1 });
        status();
        (async () => {
          if (reason === 'drop') {
            api.noise(0.6, { f: 1800, q: 0.5, vol: 0.1 });
            printNow('\n{b}#%&@~}{ ~~*&^%$##@!! ~{/}\n');
            await api.sleep(700); if (closed) return;
            printNow('\nNO CARRIER\n\n{d}' + api.pick(FUNNY_DROPS) + '{/}\n\n');
          } else if (reason === 'time') {
            printNow('\n\n{b}Your 30 minutes are up for this call!{/} Thanks for calling. Other people want a turn too.\n');
            await api.sleep(500); if (closed) return;
            printNow('\n+++\nOK\nATH0\nNO CARRIER\n\n');
          } else if (reason === 'cancel') {
            printNow('\n{d}(Dialing cancelled){/}\nNO CARRIER\n\n');
          } else {
            if (wasOnline) printNow('\n+++\nOK\nATH0\nOK\n');
            printNow('NO CARRIER\n\n');
          }
          if (closed) return;
          await new Promise(res => { want = { type: 'key', opts: [['ENTER', 'Dialing directory']], any: true, res }; renderKeys(want.opts); printNow('{d}Press any key for the dialing directory...{/}'); });
          if (!closed) showDir();
        })();
      }

      /* ---------- the BBS ---------- */
      const store = {
        users: () => api.load('users', {}),
        posts: () => api.load('posts', []),
        letters: () => api.load('letters', [])
      };
      function pay(amt, why) {
        const day = new Date().toDateString();
        let e = api.load('earned', { day, n: 0 }); if (e.day !== day) e = { day, n: 0 };
        const give = Math.min(amt, DAILY_CAP - e.n);
        if (give <= 0) return 0;
        e.n += give; api.save('earned', e);
        api.earn(give, why);
        return give;
      }
      const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
      const say = (s, me) => s.replace(/\{h\}/g, me.handle).replace(/\{H\}/g, me.handle.toUpperCase());

      async function runBBS(B) {
        await pause(300);
        await out('\f' + B.art + '\n\n');
        const me = await login(B);
        cur.me = me;
        await letters(B, me);
        await mainMenu(B, me);
        await out(`\n{b}Thanks for calling ${B.name}!{/}\nYou were online for ${mmss((Date.now() - cur.start) / 1000)}. Come back soon, ${me.handle}.\n`);
        await pause(600);
      }

      async function login(B) {
        const users = store.users();
        let me = users[B.id];
        await out(`Welcome to ${B.name}!\n\n`);
        if (me) await out(`{d}(Your handle here is ${me.handle}.){/}\n`);
        await out('Enter your handle, or type {b}NEW{/}: ');
        const choices = me ? [[me.handle, me.handle], ['NEW', 'New user']] : [['NEW', 'New user']];
        let h = await line({ max: 16, choices, label: 'Your handle' });
        if (me && h.toUpperCase() === me.handle.toUpperCase()) {
          me.calls++; users[B.id] = me; api.save('users', users);
          await out(`\n{b}Welcome back, ${me.handle}!{/} This is your call number ${me.calls}.\n`);
          await pause(400);
          return me;
        }
        if (me && h.toUpperCase() !== 'NEW') {
          if (!(await yesNo(`\nNobody here is called "${h || '?'}". Sign up as a new user?`))) return login(B);
        }
        return signup(B, h.toUpperCase() === 'NEW' ? '' : h);
      }
      async function signup(B, guess) {
        await out(`\n{r} NEW USER SIGN-UP {/}\n\nA handle is a nickname you use on the BBS.\n{b}Never use your real full name, address or phone number.{/}\n`);
        let handle = guess;
        for (;;) {
          if (!handle) { await out('\nPick a handle (2-16 letters): '); handle = await line({ max: 16, label: 'Pick a handle' }); }
          const clean = handle.replace(/[^A-Za-z0-9_.\- ]/g, '').trim().toUpperCase().replace(/ /g, '_');
          if (clean.length < 2) { await out('{d}That\'s too short. Try again.{/}\n'); handle = ''; continue; }
          if (/^(SYSOP|DALE|KEVIN|COMMANDER|NEW|ALL)$/.test(clean) || B.regulars.includes(clean)) { await out(`{d}Sorry, ${clean} is taken. Try another.{/}\n`); handle = ''; continue; }
          if (await yesNo(`\nYour handle will be {b}${clean}{/}. OK?`)) { handle = clean; break; }
          handle = '';
        }
        await out('\nWhat town are you calling from? {d}(Just the town, or press Enter to skip){/}\n: ');
        const city = (await line({ max: 20, label: 'Your town' })) || 'Somewhere';
        const users = store.users();
        const me = { handle, city, calls: 1 };
        users[B.id] = me; api.save('users', users);
        await out(`\n{b}Welcome aboard, ${handle}!{/}\nNew users get 30 minutes per call.\nPress the letter in [brackets] to pick things from menus.\n`);
        await anyKey();
        return me;
      }

      async function letters(B, me) {
        const all = store.letters();
        const mine = all.filter(l => l.bbs === B.id && !l.read && l.call < me.calls);
        if (!mine.length) return;
        await out(`\n\x07{b}You have ${mine.length} new letter${mine.length > 1 ? 's' : ''}!{/}\n`);
        for (const l of mine) {
          await out(`\n{r} From: ${B.sysop}  To: ${me.handle} {/}\nRe: your message "${l.text.slice(0, 30)}"\n\n${say(B.chat.reply, me)}\n`);
          l.read = true;
        }
        api.save('letters', all);
        await anyKey();
      }

      async function mainMenu(B, me) {
        let first = true;
        for (;;) {
          const left = Math.max(0, Math.floor((cur.limit - (Date.now() - cur.start) / 1000) / 60));
          await out(`${first ? '\f' : '\n'}{r} ${B.name.toUpperCase()} - MAIN MENU {/}\n{d}${me.handle} | ${left} min left{/}\n\n` +
            ' [M] Message boards  [F] Files\n [D] Door games      [C] Chat w/ sysop\n [B] Bulletins       [L] Last callers\n [G] Goodbye (hang up)\n\n');
          first = false;
          const k = await menuKey('Your choice: ', [['M', 'Messages'], ['F', 'Files'], ['D', 'Doors'], ['C', 'Chat'], ['B', 'Bulletins'], ['L', 'Callers'], ['G', 'Goodbye']]);
          if (k === 'M') await boards(B, me);
          else if (k === 'F') await files(B);
          else if (k === 'D') await doors(B, me);
          else if (k === 'C') await chat(B, me);
          else if (k === 'B') await bulletins(B);
          else if (k === 'L') await lastCallers(B, me);
          else if (k === 'G') { if (await yesNo('\nHang up now?')) return; }
        }
      }

      /* message boards */
      function threadsOf(B, bi, me) {
        const bd = B.boards[bi];
        const posts = store.posts().filter(p => p.bbs === B.id && p.board === bi);
        const list = bd.threads.map((t, i) => ({ id: 't' + i, subj: t[0], msgs: t[1].map(m => ({ from: m[0] === 'COMMANDER' ? 'CMDR.NOVA' : m[0], to: 'All', text: m[1] })) }));
        posts.filter(p => p.subj).forEach(p => list.push({ id: p.thread, subj: p.subj, msgs: [] }));
        list.forEach(t => {
          posts.filter(p => p.thread === t.id).forEach(p => {
            t.msgs.push({ from: p.from, to: p.subj ? 'All' : (t.msgs[t.msgs.length - 1] || {}).from || 'All', text: p.text, mine: true });
            // Other callers answer your message on a later call.
            if (me && p.call < me.calls && p.bbsUser === me.handle) {
              const who = B.regulars[hash(p.text) % B.regulars.length];
              t.msgs.push({ from: who, to: p.from, text: REPLIES[hash(p.text + who) % REPLIES.length].replace('{h}', p.from) });
            }
          });
        });
        return list;
      }
      const REPLIES = [
        'Welcome to the board, {h}! Great message.',
        'Ha! Good one, {h}.',
        '{h}, I was thinking the exact same thing.',
        'Thanks for posting, {h}. Nice to see a new name around here.',
        'Totally agree with {h}. Well said.'
      ];
      async function boards(B, me) {
        for (;;) {
          await out('\f{r} MESSAGE BOARDS {/}\n\n');
          for (let i = 0; i < B.boards.length; i++) await out(` [${i + 1}] ${B.boards[i].name} {d}(${threadsOf(B, i, me).length} threads){/}\n`);
          await out(' [Q] Back to main menu\n\n');
          const opts = B.boards.map((b, i) => [String(i + 1), b.name]).concat([['Q', 'Quit']]);
          const k = await menuKey('Which board? ', opts);
          if (k === 'Q') return;
          await board(B, me, +k - 1);
        }
      }
      async function board(B, me, bi) {
        for (;;) {
          const list = threadsOf(B, bi, me);
          await out(`\f{r} ${B.boards[bi].name.toUpperCase()} {/}\n\n`);
          for (let i = 0; i < list.length; i++) await out(`${String(i + 1).padStart(3)}. ${list[i].subj} {d}(${list[i].msgs.length}){/}\n`);
          await out('\nType a thread number to read it,\n{b}P{/} to post a new thread, {b}Q{/} to quit: ');
          const v = (await line({ max: 3, choices: [['1', '#1'], ['P', 'Post'], ['Q', 'Quit']], label: 'Thread number' })).toUpperCase();
          if (v === 'Q' || v === '') return;
          if (v === 'P') { await post(B, me, bi, null); continue; }
          const n = parseInt(v, 10);
          if (!(n >= 1 && n <= list.length)) { await out(`{d}No thread number ${v}.{/}\n`); await pause(600); continue; }
          let ti = n - 1;
          for (;;) {
            const t = threadsOf(B, bi, me)[ti];
            await readThread(t);
            const k = await menuKey(' [R] Reply  [N] Next thread  [Q] Quit: ', [['R', 'Reply'], ['N', 'Next'], ['Q', 'Quit']]);
            if (k === 'R') { await post(B, me, bi, t); }
            else if (k === 'N') { ti = (ti + 1) % list.length; continue; }
            break;
          }
        }
      }
      async function readThread(t) {
        await out(`\f{b}Subject: ${t.subj}{/}\n`);
        for (let i = 0; i < t.msgs.length; i++) {
          const m = t.msgs[i];
          await out(`\n{r} Msg ${i + 1} of ${t.msgs.length} {/} From: {b}${m.from}{/}  To: ${m.to}\n${m.text}\n`);
        }
        await out('\n{d}--- end of thread ---{/}\n\n');
      }
      async function post(B, me, bi, t) {
        let subj = null;
        if (!t) {
          await out('\nSubject: ');
          subj = await line({ max: 36, label: 'Subject' });
          if (!subj) { await out('{d}No subject, no post. Cancelled.{/}\n'); return; }
        }
        await out(`\n{r} ${t ? 'REPLY' : 'NEW MESSAGE'} {/} ${t ? 'Re: ' + t.subj : subj}\nType up to 5 lines. Press Enter on an empty line to finish.\n{d}Be kind, and no real names or phone numbers!{/}\n`);
        const lines = [];
        for (let i = 1; i <= 5; i++) {
          await out(`${i}: `);
          const l = await line({ max: 60, enterLabel: i === 1 ? 'Send' : 'Next line / Done', label: 'Message line ' + i });
          if (!l) break;
          lines.push(l);
        }
        if (!lines.length) { await out('{d}Empty message. Cancelled.{/}\n'); return; }
        const k = await menuKey('\n [S] Save message  [A] Abort: ', [['S', 'Save'], ['A', 'Abort']]);
        if (k !== 'S') { await out('{d}Message thrown away.{/}\n'); return; }
        const posts = store.posts();
        const thread = t ? t.id : 'u' + Date.now().toString(36);
        posts.push({ bbs: B.id, board: bi, thread, subj, from: me.handle, bbsUser: me.handle, text: lines.join(' '), call: me.calls, t: Date.now() });
        api.save('posts', posts.slice(-80));
        api.sfx.sent();
        await out(`\n{b}Message saved!{/} Thanks, ${me.handle}. Other callers will see it.\n`);
        const day = new Date().toDateString();
        if (api.load('postDay', '') !== day) {
          api.save('postDay', day);
          if (pay(1, 'your first BBS message today')) await out('{d}(You earned $1 for your first message today.){/}\n');
        }
        await pause(700);
      }

      /* files + XMODEM */
      const fmtN = n => n.toLocaleString('en-US');
      const xmodemCps = () => cps() * 128 / 132 * 0.93; // block overhead plus waiting for each ACK
      const fmtDur = s => { s = Math.round(s); return s < 60 ? s + ' sec' : Math.floor(s / 60) + ' min ' + (s % 60) + ' sec'; };
      async function files(B) {
        for (;;) {
          await out(`\f{r} FILE LIBRARY {/} {d}(${baud} bps){/}\n\n  #  Area\\Name              Size  Time\n`);
          for (let i = 0; i < B.files.length; i++) {
            const [area, name, size, desc] = B.files[i];
            await out(` ${String(i + 1).padStart(2)}  ${(area + '\\' + name).padEnd(19)}${fmtN(size).padStart(7)}  ${Math.ceil(size / xmodemCps() / 60)}m\n     {d}${desc}{/}\n`);
          }
          await out('\nDownload which file number? {b}Q{/} to quit: ');
          const v = (await line({ max: 2, choices: B.files.map((f, i) => [String(i + 1), f[1]]).concat([['Q', 'Quit']]), label: 'File number' })).toUpperCase();
          if (v === 'Q' || v === '') return;
          const f = B.files[parseInt(v, 10) - 1];
          if (!f) { await out(`{d}No file number ${v}.{/}\n`); await pause(600); continue; }
          await download(f);
        }
      }
      async function download([area, name, size]) {
        const blocks = Math.ceil(size / 128), per = 132 / cps() + 128 / cps() * 0.075;
        await out(`\n{b}${area}\\${name}{/}  ${fmtN(size)} bytes, ${blocks} blocks\nProtocol: XMODEM (checksum)\nEstimated time at ${baud} bps: ${fmtDur(blocks * per)}\n\n`);
        if (!(await yesNo('Start the download?'))) return;
        await out('\nStarting transfer. Press {b}A{/} to abort.\n\n');
        const live = document.createElement('span'); scr.appendChild(live); node = null;
        cur.xfer = true;
        let got = 0, errs = 0, aborted = false, t0 = Date.now(), nextAt = per;
        const draw = () => {
          const pct = got / blocks, el = (Date.now() - t0) / 1000, left = (blocks - got) * per;
          const w = 24, fill = Math.round(pct * w);
          live.textContent = `Block ${String(got).padStart(3, '0')}/${blocks}  ${fmtN(Math.min(size, got * 128))} bytes\n[${'#'.repeat(fill)}${'.'.repeat(w - fill)}] ${Math.floor(pct * 100)}%\nElapsed ${mmss(el)}  Left ~${mmss(left)}  Errors ${errs}\n`;
          scr.scrollTop = scr.scrollHeight;
        };
        draw();
        const abortP = key([['A', 'Abort transfer']]).then(v => { if (v === 'A') aborted = true; }, () => {});
        await guard(new Promise(res => {
          const iv = setInterval(() => {
            if (!online || aborted || closed) { clearInterval(iv); res(); return; }
            const el = (Date.now() - t0) / 1000;
            while (el >= nextAt && got < blocks) {
              if (Math.random() < 0.012) { errs++; nextAt += per; api.sfx.blip(300); continue; }
              got++; nextAt += per;
            }
            draw();
            if (got >= blocks) { clearInterval(iv); res(); }
          }, 120);
        }));
        cur.xfer = false;
        if (aborted) {
          await out('\n{b}Transfer aborted.{/} (The BBS got two CAN signals: cancel!)\n');
          await pause(800); return;
        }
        if (want && want.type === 'key') answer(null);
        const el = (Date.now() - t0) / 1000;
        api.sfx.ding();
        await out(`\n{b}Transfer complete!{/} ${fmtN(size)} bytes in ${fmtDur(el)}.\n{d}(This is a museum computer, so nothing was saved to your disk.){/}\n`);
        if (TEXTFILES[name]) {
          if (await yesNo(`\nShow ${name} now?`)) { await out('\n' + TEXTFILES[name] + '\n\n'); await anyKey(); }
        } else await pause(900);
      }

      /* doors */
      async function doors(B, me) {
        const names = { trader: 'Space Trader', guess: 'Kevin\'s Guess-O-Matic' };
        for (;;) {
          await out('\f{r} DOOR GAMES {/}\n\n');
          for (let i = 0; i < B.doors.length; i++) await out(` [${i + 1}] ${names[B.doors[i]]}\n`);
          await out(' [H] High scores\n [Q] Back to main menu\n\n');
          const k = await menuKey('Which door? ', B.doors.map((d, i) => [String(i + 1), names[d]]).concat([['H', 'Scores'], ['Q', 'Quit']]));
          if (k === 'Q') return;
          if (k === 'H') { await traderScores(); await anyKey(); continue; }
          const d = B.doors[+k - 1];
          await out(`\n{d}Opening door: ${names[d]}...{/}\n`); await pause(700);
          if (d === 'trader') await spaceTrader(B, me); else await guessGame(me);
        }
      }
      async function traderScores(mark) {
        const top = api.load('trader-top', TRADER_TOP.map(([n, s]) => ({ n, s })));
        await out('\n{r} SPACE TRADER HALL OF FAME {/}\n\n');
        for (let i = 0; i < top.length; i++) await out(`${mark === i ? '{b}' : ''} ${i + 1}. ${top[i].n.padEnd(16)} ${fmtN(top[i].s).padStart(7)} cr${mark === i ? '  <-- YOU!{/}' : ''}\n`);
        await out('\n');
      }

      async function spaceTrader(B, me) {
        await out(`\f{b}  *  S P A C E   T R A D E R  *{/}\n{d}      a Galaxy Nine door game{/}\n\nYou are a space trucker with an old ship,\n${fmtN(START_CR)} credits and ${JUMPS} jumps before you\nretire. Buy goods where they're cheap and\nsell them where they're expensive.\nEach jump uses fuel (credits).\nMost credits at the end wins!\n\n`);
        await anyKey();
        let cr = START_CR, hold = 20, cargo = GOODS.map(() => 0), at = 0, left = JUMPS, freeFuel = false, news = '', prices = [], base = [];
        // Markets react to you: buying pushes a price up, selling pushes it down. Planets slowly recover between jumps.
        const trade = PLANETS.map(() => GOODS.map(() => ({ b: 0, s: 0 })));
        const reprice = () => { prices = GOODS.map((_, g) => Math.max(3, Math.round(base[g] * (1 + 0.015 * trade[at][g].b) / (1 + 0.02 * trade[at][g].s)))); };
        const deal = (g, n, buy) => { let t = 0; for (let i = 0; i < n; i++) { t += prices[g]; trade[at][g][buy ? 'b' : 's']++; reprice(); } return t; };
        const quote = (g, n, buy) => { const save = { ...trade[at][g] }; const t = deal(g, n, buy); trade[at][g] = save; reprice(); return t; };
        const cargoValue = () => cargo.reduce((a, n, g) => a + (n ? quote(g, n, false) : 0), 0);
        const used = () => cargo.reduce((a, b) => a + b, 0);
        const dist = (a, b) => Math.hypot(PLANETS[a].x - PLANETS[b].x, PLANETS[a].y - PLANETS[b].y);
        const fuel = (a, b) => freeFuel ? 0 : Math.round(dist(a, b) * 5);
        function market() { base = GOODS.map(([, b], g) => b * PLANETS[at].f[g] * (0.85 + Math.random() * 0.3)); reprice(); }
        function event() {
          if (Math.random() > 0.4) return '';
          const g = Math.floor(Math.random() * GOODS.length), gn = GOODS[g][0], pn = PLANETS[at].n;
          const r = Math.floor(Math.random() * 9);
          if (r === 0) { base[g] *= 2; reprice(); return `SHORTAGE! ${pn} ran out of ${gn}. The price doubled!`; }
          if (r === 1) { base[g] *= 0.4; reprice(); return `A freighter just dumped a load of ${gn} here. Prices crashed!`; }
          if (r === 2) {
            const have = cargo.map((n, i) => [n, i]).filter(x => x[0] > 0);
            if (!have.length) return 'Asteroid storm! Lucky for you, your hold was empty.';
            const [n, i] = have[Math.floor(Math.random() * have.length)], lost = Math.max(1, Math.floor(n / 3));
            cargo[i] -= lost; return `Asteroid storm! ${lost} ${GOODS[i][0]} got knocked out the airlock.`;
          }
          if (r === 3) {
            const room = hold - used(), n = Math.min(room, 2 + Math.floor(Math.random() * 5)), i = Math.random() < 0.5 ? 0 : 1;
            if (n <= 0) return 'You spot a floating crate, but your hold is too full to grab it.';
            cargo[i] += n; return `You found a floating crate with ${n} ${GOODS[i][0]}. Finders keepers!`;
          }
          if (r === 4) return 'A friendly space whale swims past and sings to your ship. Everyone feels great.';
          if (r === 5) return 'Solar flare! For the rest of the day your radio only plays polka music.';
          if (r === 6) { const fee = Math.min(cr, 25); cr -= fee; return `The parking robot charges you ${fee} credits. It says "HAVE A NICE DAY" in a very scary voice.`; }
          if (r === 7) { freeFuel = true; return 'A retired pilot shows you a shortcut. Your next jump needs no fuel!'; }
          const best = PLANETS.map((p, i) => [p.f[4], i]).sort((a, b) => b[0] - a[0])[0][1];
          return `A trader whispers: "Robots sell for a fortune on ${PLANETS[best].n}."`;
        }
        market();
        for (;;) {
          const P = PLANETS[at];
          let s = `\f{r} SPACE TRADER {/}  Jumps left: {b}${left}{/}\n{b}${P.n.toUpperCase()}{/} {d}(${P.d}){/}\nCredits: {b}${fmtN(cr)}{/}   Hold: ${used()}/${hold}\n`;
          if (news) s += `\n{b}>> ${news}{/}\n`;
          s += '\n # Good       Price  In hold\n';
          GOODS.forEach(([n], g) => { s += ` ${g + 1} ${n.padEnd(10)} ${String(prices[g]).padStart(5)}  ${String(cargo[g]).padStart(5)}\n`; });
          s += '{d}Prices move when you buy and sell.{/}\n';
          s += `\n [B]uy [S]ell [T]ravel${at === 2 ? ' [U]pgrade' : ''}\n [H]elp [Q]uit\n\n`;
          news = '';
          await out(s);
          const opts = [['B', 'Buy'], ['S', 'Sell'], ['T', 'Travel']].concat(at === 2 ? [['U', 'Upgrade']] : []).concat([['H', 'Help'], ['Q', 'Quit']]);
          const k = await menuKey('Command: ', opts);
          if (k === 'B' || k === 'S') {
            const buy = k === 'B';
            const g = await menuKey(`${buy ? 'Buy' : 'Sell'} which good (1-5)? `, GOODS.map((x, i) => [String(i + 1), x[0]]).concat([['Q', 'Never mind']]));
            if (g === 'Q') continue;
            const gi = +g - 1;
            let max = buy ? 0 : cargo[gi];
            if (buy) { while (max < hold - used() && quote(gi, max + 1, true) <= cr) max++; }
            if (max <= 0) { news = buy ? (hold - used() <= 0 ? 'Your hold is full!' : 'You can\'t afford any.') : `You don't have any ${GOODS[gi][0]}.`; continue; }
            await out(`How many? (0-${max}, Enter = ${max}): `);
            const v = await line({ max: 4, choices: [[String(max), 'All ' + max]], label: 'How many' });
            const n = v === '' ? max : parseInt(v, 10);
            if (!(n > 0 && n <= max)) { news = 'Order cancelled.'; continue; }
            const total = deal(gi, n, buy);
            if (buy) { cargo[gi] += n; cr -= total; news = `Bought ${n} ${GOODS[gi][0]} for ${fmtN(total)} cr.`; }
            else { cargo[gi] -= n; cr += total; news = `Sold ${n} ${GOODS[gi][0]} for ${fmtN(total)} cr.`; api.sfx.blip(990); }
          } else if (k === 'U') {
            if (cr < 500) { news = 'The shipyard wants 500 credits for 10 more hold space.'; continue; }
            if (await yesNo('Add 10 hold space for 500 credits?')) { cr -= 500; hold += 10; news = `Upgraded! Your hold now carries ${hold}.`; api.sfx.ding(); }
          } else if (k === 'H') {
            await out(`\nHOW TO PLAY\nEach planet makes some goods cheaply and\nneeds others. Buy low, travel, sell high.\nTravel costs fuel: farther = more credits.\nCogsworth's shipyard sells bigger holds.\nWhen your last jump lands, your cargo is\nsold for you and the game ends.\n\n`);
            await anyKey();
          } else if (k === 'Q') {
            if (await yesNo('Quit this game? Your score won\'t count.')) return;
          } else if (k === 'T') {
            let t = '\nWhere to?\n';
            PLANETS.forEach((p, i) => { if (i !== at) t += ` [${i + 1}] ${p.n.padEnd(11)} fuel ${String(fuel(at, i)).padStart(3)} cr\n`; });
            t += ' [Q] Stay here\n';
            await out(t);
            const dest = await menuKey('Destination: ', PLANETS.map((p, i) => [String(i + 1), p.n]).filter((x, i) => i !== at).concat([['Q', 'Stay']]));
            if (dest === 'Q') continue;
            const di = +dest - 1, cost = fuel(at, di);
            if (cost > cr) {
              if (cr + cargoValue() >= cost) { news = 'Not enough credits for fuel. Sell something first!'; continue; }
              await out('\n{d}You can\'t afford the fuel, so the Space Patrol tows you there for free. Nice folks.{/}\n');
              await pause(1200);
            } else cr -= cost;
            freeFuel = false;
            await out(`\n{d}Jumping to ${PLANETS[di].n}...{/}`);
            for (let i = 0; i < 3; i++) { api.tone(300 + i * 200, 0.12, { vol: 0.04, to: 900 + i * 200 }); await pause(260); await out('.'); }
            await out('\n');
            trade.forEach(p => p.forEach(t => { t.b *= 0.7; t.s *= 0.7; }));
            at = di; left--; market(); news = event();
            if (left <= 0) {
              const sale = cargoValue();
              cr += sale; cargo = cargo.map(() => 0);
              await out(`\f{r} SPACE TRADER - RETIREMENT DAY {/}\n\nYou land on ${PLANETS[at].n} for the last time.\n${news ? '{d}' + news + '{/}\n' : ''}Your cargo sells for ${fmtN(sale)} credits.\n\nFinal credits: {b}${fmtN(cr)}{/}\n`);
              const profit = cr - START_CR;
              await out(profit > 0 ? `Profit: {b}${fmtN(profit)}{/} credits. ${profit > 15000 ? 'A legendary trader!' : profit > 5000 ? 'Excellent trading, captain!' : 'Nice work!'}\n` : 'No profit this time. Space is tough! Try again.\n');
              const top = api.load('trader-top', TRADER_TOP.map(([n, s]) => ({ n, s })));
              top.push({ n: me.handle, s: cr, me: 1 }); top.sort((a, b) => b.s - a.s);
              const pos = top.findIndex(x => x.me); top.forEach(x => delete x.me);
              api.save('trader-top', top.slice(0, 5));
              if (pos < 5) { api.sfx.tada(); await out(`\n{b}You made the Hall of Fame at #${pos + 1}!{/}\n`); }
              await traderScores(pos < 5 ? pos : -1);
              if (profit > 0 && pay(2, 'a profitable Space Trader run')) await out('{d}(You earned $2 for trading at a profit.){/}\n');
              await anyKey();
              return;
            }
          }
        }
      }

      async function guessGame(me) {
        await out('\f{b}KEVIN\'S GUESS-O-MATIC!!!{/}\n{d}by kevin (and dad){/}\n\ni am thinking of a number from 1 to 100.\nyou get 7 guesses. GO!!!\n');
        const n = 1 + Math.floor(Math.random() * 100);
        for (let i = 1; i <= 7; i++) {
          await out(`\nGuess #${i}: `);
          const g = parseInt(await line({ max: 3, label: 'Your guess' }), 10);
          if (!(g >= 1 && g <= 100)) { await out('that is not a number from 1 to 100 silly\n'); i--; continue; }
          if (g === n) {
            api.sfx.tada();
            await out(`\n{b}YOU GOT IT!!!{/} it was ${n}! you took ${i} guess${i > 1 ? 'es' : ''}.\n${i <= 5 ? 'you are a GENIUS' : 'good job!!!'}\n`);
            const best = api.load('guess-best', 99);
            if (i < best) { api.save('guess-best', i); await out('{d}New best for this computer!{/}\n'); }
            await anyKey(); return;
          }
          await out(g < n ? 'too LOW. go higher!\n' : 'too HIGH. go lower!\n');
        }
        await out(`\nout of guesses! it was {b}${n}{/}.\ntip from dad: guess the middle (50) first, then the middle of what's left.\n`);
        await anyKey();
      }

      /* chat */
      const CHAT_RULES = [
        [/\b(bye|goodbye|gotta go|cya|see ya)\b/, 'bye'],
        [/\b(hi|hello|hey|howdy|greetings|yo)\b/, 'hello'],
        [/how are you|how's it going|hows it going/, 'how'],
        [/your name|who are you/, 'name'],
        [/how old|your age/, 'age'],
        [/where (do you|are you)|live/, 'where'],
        [/dino|stego|t ?rex|tricera/, 'dino'],
        [/space|planet|star|moon|rocket|alien|comet/, 'space'],
        [/game|trader|door|score|play/, 'game'],
        [/modem|baud|bps|download|phone/, 'modem'],
        [/joke|funny|laugh/, 'joke'],
        [/school|homework|teacher|class/, 'school'],
        [/\b(dog|cat|pet|hamster|fish|cow|horse)s?\b/, 'pet'],
        [/food|eat|pizza|cookie|hungry|snack/, 'food'],
        [/help|how do i|what do i|confused|stuck/, 'help'],
        [/thank|thanks|thx/, 'thanks'],
        [/\?$/, 'question']
      ];
      function botReply(B, me, text) {
        const t = text.toLowerCase();
        for (const [re, k] of CHAT_RULES) if (re.test(t) && (B.chat.say[k] || k === 'bye')) return k === 'bye' ? null : say(B.chat.say[k][hash(t) % B.chat.say[k].length], me);
        return api.pick(TIPS_ANY);
      }
      async function chat(B, me) {
        await out(`\n${B.chat.page}`);
        for (let i = 0; i < 5; i++) { await pause(500); await out('.\x07'); }
        await pause(700);
        if (Math.random() > B.awake) {
          await out(`\n\n{b}The sysop is asleep, leave a message.{/}\n{d}${B.chat.asleep}{/}\n\nYour message (Enter to skip):\n: `);
          const m = await line({ max: 60, label: 'Message to the sysop' });
          if (m) {
            const all = store.letters(); all.push({ bbs: B.id, text: m, call: me.calls, read: false });
            api.save('letters', all.slice(-20));
            await out(`\n{b}Message saved.{/} ${B.sysop} will read it later. Check back on your next call!\n`);
          }
          await pause(900); return;
        }
        api.sfx.msg();
        await out(`\n\n{r} CHAT MODE {/} Type a line and press Enter.\n{d}Type BYE (or an empty line) to leave chat.{/}\n\n`);
        const sysLine = async s => { await out(`{b}${B.sysop.toUpperCase()}:{/} `); await out(s + '\n', 14); };
        await pause(600);
        await sysLine(say(B.chat.hi, me));
        for (let turn = 0; ; turn++) {
          await out(`${me.handle}: `);
          const l = await line({ max: 60, label: 'Chat message', enterLabel: 'Say it' });
          const r = l ? botReply(B, me, l) : null;
          await pause(700 + Math.random() * 900);
          if (r === null) { await sysLine(say(B.chat.bye, me)); break; }
          if (turn >= 7 && Math.random() < 0.5) { await sysLine(say(B.chat.end, me)); break; }
          await sysLine(r);
        }
        await out('\n{d}Leaving chat mode.{/}\n');
        await pause(700);
      }

      /* bulletins, callers */
      async function bulletins(B) {
        const list = [B.news].concat(HISTORY);
        for (;;) {
          await out('\f{r} BULLETINS {/}\n\n');
          for (let i = 0; i < list.length; i++) await out(` [${i + 1}] ${list[i][0]}\n`);
          await out(' [Q] Back to main menu\n\n');
          const k = await menuKey('Read which? ', list.map((b, i) => [String(i + 1), b[0]]).concat([['Q', 'Quit']]));
          if (k === 'Q') return;
          const b = list[+k - 1];
          await out(`\f{r} ${b[0].toUpperCase()} {/}\n\n${b[1]}\n\n`);
          await anyKey();
        }
      }
      async function lastCallers(B, me) {
        const now = new Date();
        await out('\f{r} LAST 6 CALLERS {/}\n\n');
        const rows = [[me.handle, me.city || 'Somewhere']].concat(B.last.slice(0, 5).map(h => [h, api.pick(['Prairie City', 'Maple Grove', 'Lakeview', 'Cedar Falls', 'Pine Ridge'])]));
        for (let i = 0; i < rows.length; i++) {
          const t = new Date(now - i * (37 + (hash(rows[i][0]) % 80)) * 60000);
          await out(` ${String(i + 1)}. ${rows[i][0].padEnd(14)} ${rows[i][1].slice(0, 12).padEnd(12)} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}\n`);
        }
        await out('\n');
        await anyKey();
      }

      /* ---------- menus and lifecycle ---------- */
      api.menubar([
        { label: 'Terminal', items: () => [
          { label: 'Dialing directory', fn: () => { if (online || dialing) endCall('user'); else if (view !== 'dir') showDir(); } },
          { label: 'Hang up', fn: () => endCall(dialing ? 'cancel' : 'user'), disabled: !online && !dialing },
          '-',
          { label: (baud === 300 ? '* ' : '  ') + '300 bps', fn: () => setBaud(300), disabled: online || dialing },
          { label: (baud === 1200 ? '* ' : '  ') + '1,200 bps', fn: () => setBaud(1200), disabled: online || dialing },
          '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Help', items: [{ label: 'How to use Terminal', fn: () => api.msgBox('Terminal', 'Your modem phones a bulletin board system (BBS), another computer in somebody\'s house.\n\nPick a board and it dials. Once connected, press the letter in [brackets] to choose menu items, or tap the buttons at the bottom. Text arrives at modem speed; press any key to skip ahead.\n\nPress Esc to hang up. Each call can last 30 minutes.') }] }
      ]);
      W.onClose = () => {
        closed = true;
        clearInterval(ticker); clearInterval(clock);
        if (ro) ro.disconnect();
        if (dialCall) { dialCall.cancel(); dialCall = null; }
        cancelAll();
        if (online) api.noise(0.05, { f: 700, vol: 0.1, decay: 1 });
      };
      fit(); requestAnimationFrame(fit);
      showDir();
    }
  });
})();
