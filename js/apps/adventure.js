/* Mystery of Maple Manor: a store game (1985). A classic two-word-parser text adventure in a spooky-but-friendly
   old house. Family friendly: the "ghost" turns out to be a lonely raccoon who needs a home.
   Runs in 1985 text mode; in 1990 and later it gets a window, a book typeface and a little picture of each room. */
(function () {
  'use strict';

  const MAX = 100;

  /* ---------- rooms ---------- */
  // x, y: position on the map grid for that floor (z). Exits between neighbours on a floor are always orthogonal.
  const R = {
    gate: { n: 'Front Gate', ab: 'Gate', z: 0, x: 2, y: 5, out: 1, ex: { n: 'path' },
      d: S => 'You stand at a tall iron gate with MAPLE MANOR worked into the curly metal. Beyond it, a mossy path leads north to a big old house with a crooked chimney and far too many windows.' + (S.f.settled ? ' Aunt Mabel\'s little blue car is parked by the gate.' : ' Aunt Mabel\'s car is gone.') },
    path: { n: 'Garden Path', ab: 'Path', z: 0, x: 2, y: 4, out: 1, ex: { n: 'porch', s: 'gate' },
      d: () => 'A mossy stone path winds between overgrown hedges. The house looms to the north. Somewhere a wind chime tinkles, which is either charming or spooky, depending on your mood.' },
    porch: { n: 'Front Porch', ab: 'Porch', z: 0, x: 2, y: 3, out: 1, ex: { n: 'hall', s: 'path', w: 'birdbath', e: 'roses' }, inDir: 'n',
      d: S => `A wide wooden porch with a squeaky swing. The front door is ${S.f.door ? 'standing wide open' : 'firmly shut'}${S.at.note === 'porch' ? ', and a note is pinned to it' : ''}. A faded doormat says WELCOME. Steps lead down to gardens east and west, and the path runs south.` },
    birdbath: { n: 'Birdbath Garden', ab: 'Bird', z: 0, x: 1, y: 3, out: 1, ex: { e: 'porch', w: 'oak' },
      d: () => 'A stone birdbath stands among the daisies. Tiny muddy handprints dot its rim, as if somebody very small, wearing very tiny gloves, came here to wash up. The old oak is west; the porch is east.' },
    oak: { n: 'Old Oak', ab: 'Oak', z: 0, x: 0, y: 3, out: 1, ex: { e: 'birdbath', n: 'westlawn', u: 'tree' },
      d: S => 'A giant oak tree spreads its branches over the lawn. High up sits a wooden treehouse. ' + (S.f.ropeLadder ? 'A rope ladder dangles down from it, ready to climb.' : 'Its rope ladder is rolled up and tied far above your head.') + ' A lawn stretches north, and the birdbath garden is east.' },
    westlawn: { n: 'West Lawn', ab: 'WLawn', z: 0, x: 0, y: 2, out: 1, ex: { s: 'oak', n: 'backyard' },
      d: () => 'A long, bumpy lawn beside the house. The grass needs mowing. A garden gnome with a chipped nose watches you suspiciously. The lawn continues north to the back yard and south to the old oak.' },
    backyard: { n: 'Back Yard', ab: 'BkYrd', z: 0, x: 0, y: 1, out: 1, ex: { s: 'westlawn', n: 'orchard', e: 'kitchen' },
      d: () => 'Clotheslines sag between two poles. The kitchen\'s back door is east. North, rows of fruit trees; south, the west lawn.' },
    orchard: { n: 'Orchard', ab: 'Orchd', z: 0, x: 0, y: 0, out: 1, ex: { s: 'backyard' },
      d: S => 'Gnarled apple trees grow in crooked rows, and fallen leaves crunch underfoot.' + (S.f.apple ? '' : ' One big red apple hangs high on the nearest tree, just out of reach.') + ' The back yard is south.' },
    roses: { n: 'Rose Garden', ab: 'Roses', z: 0, x: 3, y: 3, out: 1, ex: { w: 'porch', e: 'shed' },
      d: S => 'Roses of every color climb over wooden trellises. At the east end stands a little garden shed' + (S.f.shed ? ' with its door open.' : ' with a big number padlock on its door.') + ' The porch is west.' },
    shed: { n: 'Garden Shed', ab: 'Shed', z: 0, x: 4, y: 3, ex: { w: 'roses' }, outDir: 'w',
      d: () => 'Rakes, hoes and flowerpots crowd this dusty little shed. A spider in the corner has built a web shaped almost exactly like a bicycle. The door is west.' },
    hall: { n: 'Front Hall', ab: 'Hall', z: 0, x: 2, y: 2, ex: { s: 'porch', w: 'parlor', e: 'library', n: 'dining', u: 'landing' }, outDir: 's',
      d: S => `A grand hall with a black-and-white checkered floor. A tall grandfather clock stands against the wall, ${S.f.clock ? 'ticking steadily' : 'stopped at twelve o\'clock'}. Doorways lead west and east, a hallway runs north, and a staircase climbs up. The front door is south.` },
    parlor: { n: 'Parlor', ab: 'Parlr', z: 0, x: 1, y: 2, ex: { e: 'hall' },
      d: () => 'A fancy sitting room full of lace and velvet. There\'s an upright piano with a piano bench, and above the fireplace hangs a portrait of a stern man with a truly magnificent mustache. The hall is east.' },
    library: { n: 'Library', ab: 'Libry', z: 0, x: 3, y: 2, ex: { w: 'hall', d: 'passage' },
      d: S => 'Bookshelves reach all the way to the ceiling. A cozy armchair sits by the window. It smells like old paper and adventure.' + (S.f.shelf ? ' One bookshelf has swung open like a door, and stone steps lead DOWN into the dark!' : ' One red book sticks out a little from the shelf by the fireplace.') + ' The hall is west.' },
    dining: { n: 'Dining Room', ab: 'Dine', z: 0, x: 2, y: 1, ex: { s: 'hall', w: 'kitchen', e: 'study' },
      d: () => 'A long table is set for a dinner party that never happened. Three places are missing their spoons. A crystal chandelier tinkles faintly, though there is no breeze. The kitchen is west, the study east, and the hall south.' },
    kitchen: { n: 'Kitchen', ab: 'Kitch', z: 0, x: 1, y: 1, ex: { e: 'dining', n: 'pantry', w: 'backyard', d: 'cellar' }, outDir: 'w',
      d: S => 'A big, cheerful kitchen with a black iron stove. There\'s a drawer by the sink, a calendar on the wall and a cookie jar on the counter. The back door is west, the pantry north and the dining room east.' + (S.f.cellar ? ' The cellar door stands open, with stairs going down.' : ' A narrow door leads down to the cellar.') },
    pantry: { n: 'Pantry', ab: 'Pantr', z: 0, x: 1, y: 0, ex: { s: 'kitchen' },
      d: () => 'Shelves of jam jars, pickles and flour line this narrow room. A bag of birdseed on the floor has a raggedy hole chewed in it. Aunt Mabel doesn\'t even have a bird. The kitchen is south.' },
    study: { n: 'Study', ab: 'Study', z: 0, x: 3, y: 1, ex: { w: 'dining', n: 'conserv' },
      d: S => `Great-Grandpa Horace's study. A heavy wooden desk ${S.f.drawer ? 'with an open drawer' : 'with a locked drawer'} faces a big spinning globe. North, glass doors open into a sunny conservatory. The dining room is west.` },
    conserv: { n: 'Conservatory', ab: 'Consv', z: 0, x: 3, y: 0, ex: { s: 'study', e: 'greenhouse' },
      d: () => 'A glass room full of sunlight, ferns and wicker chairs. A glass door east leads out to the greenhouse. The study is south.' },
    greenhouse: { n: 'Greenhouse', ab: 'Green', z: 0, x: 4, y: 0, out: 1, ex: { w: 'conserv', s: 'herbs' },
      d: () => 'Warm and steamy. Tomato plants and orchids crowd the tables. A sign says PLEASE DO NOT EAT THE ORCHIDS. The conservatory is west, and a garden path leads south.' },
    herbs: { n: 'Herb Garden', ab: 'Herbs', z: 0, x: 4, y: 1, out: 1, ex: { n: 'greenhouse', s: 'eastlawn' },
      d: () => 'Neat rows of mint, basil and rosemary. It smells wonderful. The greenhouse is north and the east lawn is south.' },
    eastlawn: { n: 'East Lawn', ab: 'ELawn', z: 0, x: 4, y: 2, out: 1, ex: { n: 'herbs' },
      d: () => 'A quiet lawn with an old stone wishing well. A tall, prickly hedge blocks the way south, so the only way back is north.' },
    landing: { n: 'Upstairs Landing', ab: 'Landg', z: 1, x: 2, y: 2, ex: { d: 'hall', w: 'guest', e: 'auntroom', n: 'playroom', s: 'bath', u: 'attic' },
      d: S => 'A long upstairs hallway with a creaky floor. Doors lead west, east, north and south, and the stairs go down. In the ceiling is a square attic hatch' + (S.f.hatch ? ', with a folding ladder hanging down.' : '. Its pull cord snapped off long ago, leaving it far out of reach.') },
    guest: { n: 'Guest Bedroom', ab: 'Guest', z: 1, x: 1, y: 2, ex: { e: 'landing' },
      d: () => 'Your room for the visit. A big bed with fluffy pillows, and a window looking out at the old oak tree and its treehouse. The landing is east.' },
    auntroom: { n: 'Aunt Mabel\'s Bedroom', ab: 'Aunt', z: 1, x: 3, y: 2, ex: { w: 'landing', n: 'tower' },
      d: () => 'A tidy room with flowered wallpaper, a tall wardrobe and a vanity table with a jewelry box. A narrow spiral staircase in the north corner winds up into the tower. The landing is west.' },
    tower: { n: 'Tower Room', ab: 'Tower', z: 1, x: 3, y: 1, ex: { s: 'auntroom' },
      d: () => 'A little round room at the top of the tower, with windows on every side. A brass telescope on a stand points out over the grounds. The spiral stairs lead back south.' },
    playroom: { n: 'Playroom', ab: 'Play', z: 1, x: 2, y: 1, ex: { s: 'landing' },
      d: () => 'Toys everywhere! A rocking horse, a toy box and a tin toy robot. This was Aunt Mabel\'s playroom when she was a little girl. The landing is south.' },
    bath: { n: 'Bathroom', ab: 'Bath', z: 1, x: 2, y: 3, ex: { n: 'landing' },
      d: () => 'A bathroom with a claw-footed tub and a medicine cabinet over the sink. The landing is north.' },
    tree: { n: 'Treehouse', ab: 'Tree', z: 1, x: 0, y: 3, out: 1, ex: { d: 'oak' }, outDir: 'd',
      d: S => 'A snug wooden treehouse with a little window and a roof that doesn\'t leak. ' + (S.f.settled ? 'The raccoon is curled up in the crate on the blanket, snoring softly.' : S.at.blanket === 'crate' ? 'A soft blanket is tucked into a wooden crate in the corner.' : 'An empty wooden crate sits in the corner.') + ' You can see the whole garden from up here. The rope ladder leads down.' },
    attic: { n: 'Attic', ab: 'Attic', z: 2, x: 2, y: 2, ex: { d: 'landing', n: 'crawl', w: 'nook' },
      d: S => 'Dusty beams, old trunks and a dress form wearing a feathered hat. Light comes in through a round window. The ladder leads down, a cramped nook is west, and to the north a gap in the loose boards leads into a dark crawlspace.' + (S.f.friend ? '' : ' Two glowing eyes blink at you from the gap... then vanish!') },
    nook: { n: 'Attic Nook', ab: 'Nook', z: 2, x: 1, y: 2, ex: { e: 'attic' },
      d: () => 'A cramped corner under the roof, full of old suitcases and a box labeled DECORATIONS - DO NOT OPEN TILL DECEMBER. A small hole in the roof lets in a beam of daylight. It\'s just big enough for a small animal to squeeze through.' },
    crawl: { n: 'The Den', ab: 'Den', z: 2, x: 2, y: 1, dark: 1, ex: { s: 'attic' },
      d: S => 'A snug hollow under the rafters. Somebody has built a nest of shredded newspaper here, next to a pile of shiny treasures.' + (S.f.follow || S.f.settled ? '' : S.f.coax ? ' The raccoon sits beside the pile, swaying to the music and watching you hopefully.' : ' Behind the pile, two eyes shine in your flashlight beam. It\'s a RACCOON! It hunches down and chitters nervously.') + ' The attic is south.' },
    passage: { n: 'Secret Stair', ab: 'Stair', z: -1, x: 3, y: 2, dark: 1, ex: { u: 'library', w: 'tunnel' },
      d: () => 'Narrow stone steps lead up to the library. A damp tunnel heads west into the dark.' },
    tunnel: { n: 'Old Tunnel', ab: 'Tunnl', z: -1, x: 2, y: 2, dark: 1, ex: { e: 'passage', w: 'boiler' },
      d: () => 'A low brick tunnel. Cobwebs tickle your ears. Grandpa Horace must have used this to sneak down for midnight snacks. It runs east and west.' },
    boiler: { n: 'Boiler Room', ab: 'Boilr', z: -1, x: 1, y: 2, dark: 1, ex: { e: 'tunnel', n: 'cellar' },
      d: () => 'A huge iron furnace sits here, rumbling softly like a sleeping dragon. A doorway leads north, and the tunnel goes east.' },
    cellar: { n: 'Cellar', ab: 'Cellr', z: -1, x: 1, y: 1, dark: 1, ex: { s: 'boiler', u: 'kitchen' },
      d: S => 'A cool stone cellar lined with shelves of jam and pickles. Wooden stairs lead up to ' + (S.f.cellar ? 'the open kitchen door.' : 'a door. It looks painted shut from the other side.') + ' A doorway leads south.' }
  };
  const FLOORS = { '-1': 'Cellar', 0: 'Grounds and ground floor', 1: 'Upstairs', 2: 'Attic' };

  /* ---------- objects ---------- */
  // at: starting place (a room id, or null = hidden until found). fixed: can't be taken.
  const O = {
    note: { n: 'a note', w: ['note', 'paper', 'letter'], at: 'porch', read: 1,
      d: 'A note in Aunt Mabel\'s loopy handwriting. Try READ NOTE.' },
    mat: { n: 'a doormat', w: ['doormat', 'mat', 'welcome mat'], at: 'porch', fixed: 1,
      d: 'A bristly doormat that says WELCOME. One corner is a little lumpy.' },
    door: { n: 'the front door', w: ['front door', 'door'], at: 'porch', fixed: 1,
      d: S => S.f.door ? 'The big front door stands open.' : 'A heavy oak door with a brass keyhole. It\'s locked.' },
    brasskey: { n: 'a brass key', w: ['brass key', 'key', 'spare key'], at: null, d: 'A shiny brass key. It looks like it fits a big front door.' },
    swing: { n: 'a porch swing', w: ['swing', 'porch swing'], at: 'porch', fixed: 1, d: 'A wooden swing on chains. It squeaks, even when nobody is on it.' },
    sign: { n: 'the gate', w: ['gate', 'sign', 'iron gate'], at: 'gate', fixed: 1, d: 'The curly iron letters say MAPLE MANOR - 1887.' },
    birdbath: { n: 'a birdbath', w: ['birdbath', 'bath', 'handprints', 'prints'], at: 'birdbath', fixed: 1,
      d: 'The muddy prints have five little fingers each. Not a bird, not a person... something with tiny hands.' },
    oaktree: { n: 'the old oak', w: ['oak', 'tree', 'treehouse'], at: 'oak', fixed: 1, d: 'A huge old oak. The treehouse up in its branches looks cozy and dry.' },
    ropeladder: { n: 'a rope ladder', w: ['rope ladder', 'ladder', 'rope'], at: 'oak', fixed: 1,
      d: S => S.f.ropeLadder ? 'The rope ladder hangs down, ready to climb.' : 'It\'s rolled up and tied to a branch high above. You\'d need something long with a hook to pull it down.' },
    gnome: { n: 'a garden gnome', w: ['gnome', 'garden gnome'], at: 'westlawn', fixed: 1, d: 'He has a chipped nose and a look that says "I know what you did." You didn\'t do anything.' },
    appletree: { n: 'an apple tree', w: ['apple tree', 'tree', 'trees', 'branch'], at: 'orchard', fixed: 1,
      d: S => S.f.apple ? 'The tree is bare now. You got the last good apple.' : 'One big red apple hangs high up, out of reach. The branches are too thin to climb, but the trunk is skinny enough to shake.' },
    apple: { n: 'a red apple', w: ['red apple', 'apple', 'fruit'], at: null, d: 'A big, shiny, red apple. Delicious. Somebody would love this.' },
    clothes: { n: 'the clotheslines', w: ['clothesline', 'clotheslines', 'line', 'poles'], at: 'backyard', fixed: 1, d: 'Empty clotheslines. One clothespin is missing. Probably not important. Probably.' },
    padlock: { n: 'a padlock', w: ['padlock', 'lock', 'shed door', 'shed', 'dials'], at: 'roses', fixed: 1,
      d: S => S.f.shed ? 'The padlock hangs open.' : 'A padlock with three little number dials. To try a combination, type something like DIAL 123.' },
    roses: { n: 'roses', w: ['roses', 'rose', 'trellis', 'flowers'], at: 'roses', fixed: 1, d: 'Red, pink, yellow and white. They smell lovely. Watch the thorns!' },
    screwdriver: { n: 'a screwdriver', w: ['screwdriver', 'driver'], at: 'shed', d: 'A tiny screwdriver, just right for tiny screws.' },
    oilcan: { n: 'an oil can', w: ['oil can', 'oilcan', 'oil', 'can'], at: 'shed', d: 'A little can of machine oil with a long, skinny spout. Good for squeaky things.' },
    web: { n: 'a spider web', w: ['web', 'spider', 'cobweb'], at: 'shed', fixed: 1, d: 'It really does look like a bicycle. The spider looks proud of it.' },
    tools: { n: 'garden tools', w: ['rake', 'rakes', 'hoe', 'tools', 'flowerpots', 'pots'], at: 'shed', fixed: 1, d: 'Ordinary garden tools. None of them are what you need.' },
    clock: { n: 'a grandfather clock', w: ['grandfather clock', 'clock', 'pendulum'], at: 'hall', fixed: 1,
      d: S => S.f.clock ? 'The clock ticks steadily. A little door at the bottom of its case hangs open.' : 'A tall clock in a carved wooden case, stopped at twelve. There\'s a keyhole on the face for winding it, and a little door at the bottom of the case.' },
    silverkey: { n: 'a small silver key', w: ['silver key', 'small key', 'key'], at: null, d: 'A small silver key, like the kind for a desk drawer.' },
    stairs: { n: 'the stairs', w: ['stairs', 'staircase', 'steps'], at: 'hall', fixed: 1, d: 'A grand staircase with a polished banister. Perfect for sliding down. (Don\'t.)' },
    piano: { n: 'a piano', w: ['piano', 'keys'], at: 'parlor', fixed: 1, d: 'An old upright piano, a little out of tune. The bench in front of it has a lid that lifts up.' },
    bench: { n: 'a piano bench', w: ['piano bench', 'bench', 'lid'], at: 'parlor', fixed: 1,
      d: S => S.f.bench ? 'The bench lid is open. Inside: old sheet music.' : 'A piano bench with a lid. People keep sheet music inside these.' },
    windkey: { n: 'a winding key', w: ['winding key', 'clock key', 'key', 'crank'], at: null, d: 'A brass key with a butterfly-shaped handle, the kind used to wind a clock.' },
    music: { n: 'some sheet music', w: ['sheet music', 'music', 'song', 'sheet'], at: null, read: 1,
      d: 'A song called "Hush, Little Critter". A note in the margin says: "Mabel\'s favorite lullaby. It\'s the same tune as her music box!"' },
    portrait: { n: 'a portrait', w: ['portrait', 'painting', 'picture', 'horace', 'man', 'mustache'], at: 'parlor', fixed: 1,
      d: 'Great-Grandpa Horace, with a mustache like two squirrel tails. His eyes seem to follow you around the room. It\'s just a very good painting.' },
    shelves: { n: 'bookshelves', w: ['bookshelves', 'bookshelf', 'shelves', 'shelf', 'books'], at: 'library', fixed: 1,
      d: S => S.f.shelf ? 'One bookshelf has swung out like a door. Stone steps lead down behind it.' : 'Thousands of books. Adventure, mystery, a whole shelf about beetles. One RED BOOK sticks out a little, like it\'s been pulled many times.' },
    redbook: { n: 'a red book', w: ['red book', 'book'], at: 'library', fixed: 1, d: 'A red book titled "Secrets of Old Houses". It won\'t come off the shelf. It tilts, like a lever.' },
    newspaper: { n: 'a newspaper', w: ['newspaper', 'gazette', 'paper'], at: 'library', read: 1,
      d: 'The Maple Grove Gazette. Headline: SPOOKY SOUNDS AT MAPLE MANOR? "Neighbors report thumps, chattering and glowing eyes at night," it says. "Mrs. Mabel Pennywhistle says she is not worried, only missing some cookies."' },
    chandelier: { n: 'a chandelier', w: ['chandelier', 'table', 'spoons', 'places'], at: 'dining', fixed: 1, d: 'Three spoons are missing from the table. Only the shiny silver ones. Who would take just spoons?' },
    drawer: { n: 'a kitchen drawer', w: ['kitchen drawer', 'drawer'], at: 'kitchen', fixed: 1, d: S => S.f.kdrawer ? 'The drawer is open. String, rubber bands, and a lot of twist ties.' : 'A drawer by the sink. Every kitchen has one drawer full of useful junk.' },
    flashlight: { n: 'a flashlight', w: ['flashlight', 'torch', 'light', 'lamp'], at: null,
      d: S => S.f.batteries ? `A sturdy flashlight with fresh batteries. It is ${S.f.lit ? 'ON' : 'off'}.` : 'A sturdy flashlight. You click the switch: nothing. The battery tube is empty!' },
    calendar: { n: 'a calendar', w: ['calendar'], at: 'kitchen', fixed: 1, read: 1,
      d: 'A calendar with a picture of a prize-winning pie. Aunt Mabel has written on it: "Fair: judge pies!" and, in tiny letters in the corner, "Shed lock: 7-2-5. (Don\'t tell the squirrels.)"' },
    jar: { n: 'a cookie jar', w: ['cookie jar', 'jar', 'cookies', 'crumbs'], at: 'kitchen', fixed: 1,
      d: 'The cookie jar is EMPTY. Crumbs are scattered all around it, along with tiny muddy handprints. A cookie thief with very small hands!' },
    stove: { n: 'a stove', w: ['stove', 'oven', 'sink'], at: 'kitchen', fixed: 1, d: 'A big black iron stove. It\'s cold. No baking today.' },
    backdoor: { n: 'the back door', w: ['back door', 'door', 'bolt'], at: 'kitchen', fixed: 1, d: S => S.f.backdoor ? 'The back door is unbolted.' : 'The back door is bolted from this side. Just walk WEST and you\'ll slide the bolt.' },
    cellardoor: { n: 'the cellar door', w: ['cellar door', 'cellar', 'door'], at: 'kitchen', fixed: 1,
      d: S => S.f.cellar ? 'The cellar door stands open.' : 'Someone painted this door so many times it\'s stuck tight. It won\'t budge from this side. Maybe a push from below would do it.' },
    seed: { n: 'a bag of birdseed', w: ['birdseed', 'bag', 'seed', 'hole', 'jars', 'jam'], at: 'pantry', fixed: 1, d: 'Something has been snacking on this birdseed. The hole is chewed, not cut. And there are those little handprints again.' },
    desk: { n: 'a desk', w: ['desk'], at: 'study', fixed: 1, d: S => S.f.drawer ? 'A heavy desk. The drawer is unlocked.' : 'A heavy wooden desk. Its drawer has a small silver keyhole.' },
    ddrawer: { n: 'a desk drawer', w: ['desk drawer', 'drawer', 'keyhole'], at: 'study', fixed: 1, d: S => S.f.drawer ? 'The drawer is open.' : 'The desk drawer is locked. The keyhole is small and silver.' },
    globe: { n: 'a globe', w: ['globe'], at: 'study', fixed: 1, d: 'You give it a spin. It stops on the middle of the Pacific Ocean. Good luck walking there.' },
    journal: { n: 'a journal', w: ['journal', 'diary', 'notebook'], at: null, read: 1, d: 'Aunt Mabel\'s journal, bound in green leather. The handwriting inside is tiny.' },
    ferns: { n: 'ferns', w: ['ferns', 'fern', 'chairs', 'plants'], at: 'conserv', fixed: 1, d: 'Big leafy ferns. Very relaxing.' },
    orchids: { n: 'orchids', w: ['orchids', 'orchid', 'tomatoes', 'tomato', 'plants'], at: 'greenhouse', fixed: 1, d: 'Beautiful orchids. You feel a strong urge NOT to eat them.' },
    herbs: { n: 'herbs', w: ['herbs', 'mint', 'basil', 'rosemary'], at: 'herbs', fixed: 1, d: 'Fresh herbs. They smell like a pizza parlor.' },
    well: { n: 'a wishing well', w: ['wishing well', 'well'], at: 'eastlawn', fixed: 1, d: 'An old stone well. The water far below twinkles. People used to throw coins in and make a wish.' },
    coin: { n: 'a shiny penny', w: ['penny', 'coin'], at: 'tower', d: 'A shiny 1985 penny. Lucky!' },
    hatch: { n: 'an attic hatch', w: ['attic hatch', 'hatch', 'cord', 'ceiling'], at: 'landing', fixed: 1,
      d: S => S.f.hatch ? 'The hatch is open and a folding ladder hangs down.' : 'A square hatch in the ceiling. The pull cord broke off years ago. You\'d need something long with a hook to reach it.' },
    blanket: { n: 'a patchwork blanket', w: ['patchwork blanket', 'blanket', 'quilt'], at: 'guest', d: 'A soft, warm patchwork blanket. Very snuggly.' },
    bed: { n: 'a bed', w: ['bed', 'pillows', 'pillow'], at: 'guest', fixed: 1, d: 'A big soft bed. No time for naps. There\'s a mystery to solve!' },
    wardrobe: { n: 'a wardrobe', w: ['wardrobe', 'closet'], at: 'auntroom', fixed: 1, d: 'Just coats in here. And one very surprised moth.' },
    jewelbox: { n: 'a jewelry box', w: ['jewelry box', 'jewellery box', 'jewelry', 'vanity'], at: 'auntroom', fixed: 1, d: 'Inside is an empty velvet spot shaped like a locket. A tag says: "Mother\'s silver locket." It\'s missing!' },
    telescope: { n: 'a telescope', w: ['telescope', 'scope', 'windows'], at: 'tower', fixed: 1,
      d: S => S.f.settled ? 'You spot the treehouse. A striped tail pokes out of the window. Sweet dreams, little friend.' : 'You peer through the telescope. You can see the whole estate: the orchard, the rose garden, the old oak with its treehouse... and on the roof, a small masked face peeks out of a hole near the attic, then ducks back in!' },
    horse: { n: 'a rocking horse', w: ['rocking horse', 'horse', 'toy box', 'toybox', 'toys'], at: 'playroom', fixed: 1, d: 'A dappled rocking horse named Buttons, according to the name painted on its side. The toy box holds blocks and a jump rope.' },
    robot: { n: 'a toy robot', w: ['toy robot', 'robot', 'hatch', 'screw'], at: 'playroom', fixed: 1,
      d: S => S.f.robot ? 'The robot\'s battery hatch is open. It looks a bit embarrassed.' : 'A tin toy robot with light-up eyes. On its back is a little battery hatch held shut by a tiny screw.' },
    batteries: { n: 'some batteries', w: ['batteries', 'battery', 'cells'], at: null, d: 'Two batteries. Still good!' },
    musicbox: { n: 'a music box', w: ['music box', 'musicbox', 'box'], at: 'playroom',
      d: S => S.f.oiled ? 'A pretty music box with a tiny dancing bear on top. Its gears are oiled and it plays beautifully.' : 'A pretty music box with a tiny dancing bear on top. When you try to wind it, it just goes SQUEAAAK. The gears are rusty and stuck.' },
    cabinet: { n: 'a medicine cabinet', w: ['medicine cabinet', 'cabinet', 'mirror'], at: 'bath', fixed: 1, d: S => S.f.cabinet ? 'The cabinet is open: toothpaste, bandages, a comb.' : 'A mirrored medicine cabinet over the sink. You look great, by the way.' },
    glasses: { n: 'reading glasses', w: ['reading glasses', 'glasses', 'spectacles'], at: null, d: 'Aunt Mabel\'s spare reading glasses. They make small writing look big.' },
    duck: { n: 'a rubber duck', w: ['rubber duck', 'duck'], at: 'bath', d: 'A yellow rubber duck. It looks brave.' },
    tub: { n: 'a bathtub', w: ['bathtub', 'tub'], at: 'bath', fixed: 1, d: 'A claw-footed tub. The feet look like lion paws. Very fancy.' },
    crate: { n: 'a wooden crate', w: ['wooden crate', 'crate', 'corner'], at: 'tree', fixed: 1,
      d: S => S.f.settled ? 'The raccoon is snoozing in it.' : S.at.blanket === 'crate' ? 'The crate has a blanket in it. It looks like the coziest bed in the world.' : 'An empty wooden crate. It would make a great bed for somebody small, if it had something soft in it.' },
    trunks: { n: 'old trunks', w: ['trunks', 'trunk', 'dress form', 'hat', 'suitcases', 'beams'], at: 'attic', fixed: 1, d: 'Old trunks full of old clothes. The dress form in its feathered hat looks exactly like a ghost from the corner of your eye. It is not a ghost.' },
    gap: { n: 'a gap in the boards', w: ['gap', 'boards', 'eyes', 'crawlspace'], at: 'attic', fixed: 1, d: 'A gap in the loose boards, just big enough to squeeze through. It\'s pitch dark in there.' },
    roofhole: { n: 'a hole in the roof', w: ['hole', 'roof', 'decorations'], at: 'nook', fixed: 1, d: 'A small hole in the roof. Little claw marks around the edge. Someone uses this as a front door!' },
    nest: { n: 'a nest', w: ['nest', 'newspaper'], at: 'crawl', fixed: 1, d: 'A nest of shredded newspaper. Cozy, but a bit drafty up here.' },
    stash: { n: 'a pile of treasures', w: ['pile', 'treasures', 'treasure', 'stash', 'shiny', 'spoons', 'caps'], at: 'crawl', fixed: 1,
      d: S => S.f.friend ? 'Three silver spoons, bottle caps, foil balls, a clothespin' + (S.at.locket === 'crawl' ? ' and a silver LOCKET.' : '.') : 'Spoons, bottle caps, a ball of foil... and something silver glints at the bottom. The raccoon guards it with a grumbly chatter.' },
    raccoon: { n: 'a raccoon', w: ['raccoon', 'ghost', 'animal', 'critter', 'creature', 'eyes'], at: 'crawl', fixed: 1,
      d: S => S.f.settled ? 'Curled up in the blanket, snoring. It has a smile on its masked face. (Probably.)' : S.f.friend ? 'A chubby raccoon with a black mask and a striped tail. It looks at you like you\'re its best friend.' : S.f.coax ? 'The raccoon sways to the music. It sniffs the air hopefully. It looks hungry.' : 'A raccoon with a black mask, like a tiny bandit. It\'s nervous and hides behind its treasure pile. It looks lonely.' },
    locket: { n: 'a silver locket', w: ['silver locket', 'locket', 'necklace'], at: null, d: 'A silver locket on a chain. Inside is a tiny photo of a young girl on a rocking horse. Aunt Mabel!' },
    furnace: { n: 'a furnace', w: ['furnace', 'boiler'], at: 'boiler', fixed: 1, d: 'An enormous iron furnace. It rumbles. It is NOT a dragon, you tell yourself.' },
    pole: { n: 'a hooked pole', w: ['hooked pole', 'pole', 'hook', 'stick'], at: 'cellar', d: 'A long wooden pole with a metal hook on the end, for reaching things up high.' },
    preserves: { n: 'preserves', w: ['preserves', 'jam', 'pickles', 'jars', 'shelves'], at: 'cellar', fixed: 1, d: 'Jars of strawberry jam and dill pickles, all labeled in Aunt Mabel\'s handwriting.' },
    cobwebs: { n: 'cobwebs', w: ['cobwebs', 'cobweb', 'bricks'], at: 'tunnel', fixed: 1, d: 'Old dusty cobwebs. No spiders home.' },
    mabel: { n: 'Aunt Mabel', w: ['aunt mabel', 'mabel', 'aunt', 'car'], at: null, fixed: 1, d: 'Aunt Mabel, in her fair hat with a blue ribbon on it. She looks delighted to see you.' }
  };

  /* ---------- scoring and hints ---------- */
  const PTS = { mat: 3, door: 5, shed: 5, batteries: 5, bench: 2, clock: 8, drawer: 4, journal: 6, shelf: 8, hatch: 8, oiled: 6, apple: 3, coax: 6, friend: 8, locket: 5, ropeLadder: 4, settled: 8, won: 6 };
  const PUZ = [
    ['Getting inside', S => true, S => S.f.door, [
      'Aunt Mabel\'s note tells you where the spare key is.',
      'Where does everybody wipe their feet?',
      'LOOK UNDER MAT, TAKE KEY, then UNLOCK DOOR.']],
    ['The shed padlock', S => S.seen.roses, S => S.f.shed, [
      'The padlock needs three numbers. Somebody wrote them down.',
      'Aunt Mabel writes everything on her kitchen calendar.',
      'READ CALENDAR in the kitchen. Then at the rose garden, type DIAL 725.']],
    ['The empty flashlight', S => S.at.flashlight !== null, S => S.f.batteries, [
      'A flashlight needs batteries. Is anything else in the house battery powered?',
      'The toy robot in the playroom runs on batteries. Its hatch has a tiny screw.',
      'Get the screwdriver from the garden shed. OPEN ROBOT, TAKE BATTERIES, then PUT BATTERIES IN FLASHLIGHT and TURN ON FLASHLIGHT.']],
    ['The stopped clock', S => S.seen.hall, S => S.f.clock, [
      'Old clocks don\'t run forever. They need winding.',
      'A clock key is often kept near other music-making things. Try the parlor.',
      'OPEN BENCH in the parlor, TAKE WINDING KEY, then WIND CLOCK in the hall.']],
    ['The locked desk drawer', S => S.seen.study, S => S.f.drawer, [
      'The drawer has a small silver keyhole.',
      'Something fell out of the grandfather clock when it chimed.',
      'Take the silver key from the hall and UNLOCK DRAWER in the study.']],
    ['Aunt Mabel\'s tiny handwriting', S => S.at.journal !== null, S => S.f.journal, [
      'Aunt Mabel needs help reading small print too.',
      'People often keep reading glasses in the bathroom.',
      'OPEN CABINET in the bathroom, TAKE GLASSES, then READ JOURNAL.']],
    ['Grandpa\'s secret stair', S => S.seen.library || S.f.journal, S => S.f.shelf, [
      'The journal mentions Grandpa Horace\'s secret stair in the library.',
      'EXAMINE SHELVES in the library. One book looks different.',
      'PULL RED BOOK. You\'ll need a light before you go DOWN.']],
    ['The attic hatch', S => S.seen.landing, S => S.f.hatch, [
      'The hatch cord broke. You need something long to reach the hatch.',
      'Aunt Mabel\'s journal says where the hooked pole is: the cellar.',
      'Take the hooked pole from the cellar (you need light to see it), then PULL HATCH on the upstairs landing.']],
    ['The squeaky music box', S => S.seen.playroom, S => S.f.oiled, [
      'The music box is stuck and squeaks. What fixes squeaks?',
      'There is an oil can in the garden shed.',
      'Get the oil can and type OIL MUSIC BOX.']],
    ['The ghost in the attic', S => S.seen.attic, S => S.f.friend, [
      'The "ghost" hides past the loose boards north of the attic. Bring a light!',
      'Shy animals like gentle music. And food makes friends. Something healthier than cookies...',
      'With your flashlight on, go NORTH into the den, PLAY MUSIC BOX, then GIVE APPLE TO RACCOON. (To get an apple, SHAKE TREE in the orchard.)']],
    ['The rolled-up rope ladder', S => S.seen.oak, S => S.f.ropeLadder, [
      'The treehouse ladder is rolled up too high to reach.',
      'Something long with a hook would help.',
      'At the old oak, carry the hooked pole and type PULL LADDER.']],
    ['A home for the raccoon', S => S.f.friend, S => S.f.settled, [
      'The raccoon needs a cozy, dry place of its own. Not Aunt Mabel\'s attic!',
      'The treehouse would be perfect, but it needs something soft.',
      'Take the blanket from the guest bedroom. With the raccoon following you, climb UP into the treehouse and PUT BLANKET IN CRATE.']],
    ['Aunt Mabel\'s locket', S => S.f.settled, S => S.f.won, [
      'Aunt Mabel is home! She\'s waiting at the front gate.',
      'She\'s missing something shiny. The raccoon had it.',
      'TAKE LOCKET from the raccoon\'s treasure pile in the den, then GIVE LOCKET TO MABEL at the front gate.']]
  ];

  /* ---------- words ---------- */
  const DIRS = { n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w', u: 'u', up: 'u', upstairs: 'u', d: 'd', down: 'd', downstairs: 'd' };
  const DIRNAME = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
  const VERBS = {
    take: ['take', 'get', 'grab', 'carry', 'collect', 'fetch'],
    drop: ['drop', 'discard', 'release'],
    examine: ['examine', 'x', 'inspect', 'check', 'study', 'describe', 'observe', 'view'],
    look: ['look', 'l'],
    search: ['search'],
    lookunder: ['lookunder', 'lift', 'raise'],
    inventory: ['inventory', 'i', 'inv', 'invent'],
    open: ['open', 'unwrap'],
    close: ['close', 'shut'],
    unlock: ['unlock'],
    move: ['move', 'push', 'shove', 'slide', 'shift', 'press', 'tilt'],
    pull: ['pull', 'yank', 'tug', 'drag', 'hook'],
    read: ['read', 'skim'],
    use: ['use', 'apply', 'try'],
    wind: ['wind', 'crank'],
    turn: ['turn', 'twist', 'rotate', 'spin'],
    dial: ['dial', 'set', 'enter', 'combination', 'code'],
    play: ['play', 'strum'],
    oil: ['oil', 'lubricate', 'grease'],
    light: ['light', 'activate'],
    unlight: ['unlight', 'extinguish', 'deactivate'],
    put: ['put', 'insert', 'place', 'stuff'],
    give: ['give', 'offer', 'feed', 'hand', 'show'],
    shake: ['shake', 'rattle', 'jiggle'],
    climb: ['climb', 'scale', 'ascend'],
    wear: ['wear', 'don'],
    eat: ['eat', 'taste', 'munch', 'bite', 'lick'],
    smell: ['smell', 'sniff'],
    listen: ['listen', 'hear'],
    talk: ['talk', 'speak', 'chat', 'greet', 'hello', 'hi', 'say', 'ask', 'tell'],
    pet: ['pet', 'stroke', 'pat', 'hug', 'cuddle', 'tickle'],
    knock: ['knock', 'ring', 'doorbell'],
    wait: ['wait', 'z'],
    throw: ['throw', 'toss', 'flip'],
    break: ['break', 'kick', 'hit', 'smash', 'attack', 'punch', 'fight', 'kill', 'destroy', 'bash', 'chop'],
    squeeze: ['squeeze', 'squish', 'squeak'],
    sleep: ['sleep', 'nap', 'rest'],
    jump: ['jump', 'hop', 'dance'],
    sing: ['sing', 'hum', 'whistle'],
    yell: ['yell', 'shout', 'scream', 'boo', 'holler'],
    go: ['go', 'walk', 'run', 'head', 'travel', 'move to', 'enter', 'exit', 'leave', 'out', 'in', 'inside', 'outside'],
    score: ['score', 'points'],
    save: ['save'],
    load: ['load', 'restore'],
    restart: ['restart', 'new'],
    hint: ['hint', 'hints', 'clue', 'clues'],
    help: ['help', 'commands', 'instructions', 'about'],
    map: ['map'],
    again: ['again', 'g', 'repeat'],
    quit: ['quit', 'q', 'bye'],
    magic: ['xyzzy', 'plugh', 'abracadabra', 'hocus', 'shazam', 'please']
  };
  const VERB = {}; Object.entries(VERBS).forEach(([k, list]) => list.forEach(w => { VERB[w] = k; }));
  // "go" is special: "enter"/"leave" etc. are directional helpers; a real "enter 725" is a padlock code, handled below.
  const STOP = new Set(['the', 'a', 'an', 'to', 'at', 'with', 'on', 'in', 'into', 'onto', 'from', 'using', 'my', 'some', 'of', 'please', 'then', 'that', 'this', 'it', 'its', 'for', 'around', 'inside', 'through', 'toward', 'towards', 'and', 'again', 'up', 'down', 'off', 'out', 'over', 'under']);

  /* ---------- pictures (1990 and later) ---------- */
  const ART = {
    gate: String.raw`
   _|__|__|__|__|__|__|_
  |    MAPLE  MANOR     |
  | |  |  |  __  |  |  ||
  | |  |  | /  \ |  |  ||
 _|_|__|__|_|__|_|__|__||_`,
    porch: String.raw`
      /\_______________/\
     /  \   _______   /  \
    | [] | |   |   | | [] |
    |    | |  o|   | |    |
  __|____|_|___|___|_|____|__
        [ WELCOME ]`,
    hall: String.raw`
   _____            ___
  | (o) |   |~~~|  |   |
  |  |  |   |   |  |   |
  |  |  |   |___|  |   |
  |__|__|          |___|
  [#][ ][#][ ][#][ ][#][ ]`,
    parlor: String.raw`
     _________    .------.
    |.:::::::.|   | O  O |
    |_________|   |  ==  |
    |  ~~~~~  |   '------'
    |_|_____|_|   [bench]`,
    library: String.raw`
  |==|==|==|==|==|==|==|
  ||| ||| |||R||| |||| |
  |==|==|==|==|==|==|==|
  |||| ||| || |||| |||||
  |==|==|==|==|==|==|==|`,
    kitchen: String.raw`
    ___         _____
   (   )  _    |o o o|
   |cookie| |  |_____|
   |______| |  | [ ] |
  ==========|==|_____|==`,
    oak: String.raw`
        .-~~~~~~~-.
      .~  _______  ~.
     (   |  []   |   )
      '~.|_______|.~'
          ||   ||
      ____||___||____`,
    orchard: String.raw`
    ,@@,     ,@@,     ,@@,
   @@@@@@   @@o@@@   @@@@@@
    '||'     '||'     '||'
  ___||_______||_______||___`,
    roses: String.raw`
   @ * @ * @      ______
   *\|/*\|/*     /______\
    \|/ \|/      | [==] |
  ___|___|_______|__[]__|_`,
    shed: String.raw`
     ____________
    |  /  | |  / |
    | /   | | /  |   (bicycle
    |/    |_|/   |     web)
  __|____________|__`,
    study: String.raw`
      ,-~~-.      ________
     ( ~~~~ )    |  ____  |
      '-||-'     | |_[]_| |
    ____||____   |________|
   /__________\  |_|    |_|`,
    tower: String.raw`
         /\
        /  \
       /____\    ===o
      | [] []|  //
      |______| //`,
    playroom: String.raw`
     [o_o]    __n__
     /|=|\   (_____)  ~~~
      | |     /   \  (bear)
  ____|_|____/_____\______`,
    attic: String.raw`
        /\
       /  \      .---.
      / () \     | o | <- eyes?
     /______\    '---'
    /________\ [trunk] [hat]`,
    crawl: String.raw`
     ____________________
    /   .--.             \
   |   ( ^^ )  .o0Oo.     |
   |    \==/  spoons caps |
    \____________________/`,
    tree: String.raw`
       _________
      /_________\
      | [] |    |
      |____|____|
     ~~~~~||~~~~~`,
    well: String.raw`
       _________
      |_________|
       |  ___  |
       | |~~~| |
    ___|_|___|_|___`,
    bath: String.raw`
     _____        ___
    |  _  |      (   )>
    | |_| |     __\_/__
    |_____|    (_______)`,
    dark: String.raw`



            .  .
      (it is very dark)`
  };
  const ARTFOR = { eastlawn: 'well', nook: 'attic', landing: 'hall', auntroom: 'parlor', guest: 'parlor', dining: 'kitchen', pantry: 'kitchen', path: 'gate', birdbath: 'roses', westlawn: 'oak', backyard: 'orchard', greenhouse: 'roses', herbs: 'roses', conserv: 'study', cellar: 'dark', boiler: 'dark', tunnel: 'dark', passage: 'dark' };

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#2a1a3a"/><rect x="24" y="3" width="4" height="4" fill="#ffe89a"/><polygon points="4,14 16,5 28,14" fill="#6b2f2f"/><rect x="6" y="14" width="20" height="15" fill="#b98a55"/><rect x="18" y="6" width="3" height="5" fill="#6b2f2f"/><rect x="9" y="17" width="4" height="4" fill="#ffd34d"/><rect x="19" y="17" width="4" height="4" fill="#222"/><rect x="20" y="18" width="1" height="1" fill="#fff"/><rect x="22" y="18" width="1" height="1" fill="#fff"/><rect x="14" y="22" width="4" height="7" fill="#4a2a1a"/><rect x="2" y="29" width="28" height="3" fill="#2f5a2f"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'maplemanor',
    label: 'Mystery of Maple Manor',
    kind: 'store',
    year: 1985,
    price: 14.95,
    sizeKB: 180,
    cmd: 'MANOR',
    cat: 'game',
    publisher: 'Lanternlight Software',
    genre: 'Text adventure',
    tagline: 'Something is creaking in the attic...',
    blurb: 'Aunt Mabel\'s rambling old house has a ghost. Or does it? Explore 35 rooms, from the secret stair to the treehouse, solve a dozen puzzles and uncover the truth. You play by typing: GO NORTH, OPEN DOOR, TAKE LAMP. Friendly, funny and never too scary. Built-in hints and a map. For ages 8 and up.',
    box: { bg: '#2a1a3a', fg: '#ffe89a', accent: '#d9822b' },
    icon: ICON,
    window: { w: 660, h: 500 },
    css: `
      .mmr{position:absolute;inset:0;display:flex;flex-direction:column;background:#f3ead3;color:#2b1d12;font:15px/1.45 Georgia,"Times New Roman",Times,serif}
      .mmr .mmr-st{flex:none;display:flex;gap:10px;justify-content:space-between;background:#4a2e5c;color:#ffe89a;padding:3px 8px;font:bold 13px/1.3 Georgia,serif;white-space:nowrap;overflow:hidden}
      .mmr .mmr-st span:first-child{overflow:hidden;text-overflow:ellipsis}
      .mmr .mmr-art{flex:none;margin:6px 8px 0;background:#1d1426;color:#f0c46a;border:2px solid #7a5a3a;font:11px/1.15 "Courier New",Courier,monospace;white-space:pre;overflow:hidden;height:7.6em;padding:2px 8px;display:flex;align-items:center;justify-content:center}
      .mmr .mmr-art pre{margin:0;font:inherit}
      .mmr .mmr-out{flex:1;min-height:0;overflow-y:auto;padding:6px 12px;word-break:break-word}
      .mmr .mmr-out p{margin:0 0 .55em}
      .mmr .mmr-out .mmr-cmd{color:#7a3b12;font-style:italic;margin-top:.8em}
      .mmr .mmr-out .mmr-rm{font-weight:bold;font-size:1.08em;color:#4a2e5c;margin:.4em 0 .15em}
      .mmr .mmr-out .mmr-sys{color:#6a5a4a;font-style:italic}
      .mmr .mmr-out .mmr-big{font-weight:bold;color:#4a2e5c}
      .mmr .mmr-out pre{margin:.2em 0 .6em;font:12px/1.2 "Courier New",Courier,monospace;white-space:pre;overflow-x:auto}
      .mmr .mmr-in{flex:none;display:flex;align-items:center;gap:6px;padding:4px 8px;border-top:1px solid #c7b48f}
      .mmr .mmr-in b{font:bold 16px "Courier New",monospace}
      .mmr .mmr-in input{flex:1;min-width:0;font:16px "Courier New",Courier,monospace;padding:4px 6px;text-transform:uppercase}
      .mmr .mmr-in .btn{min-height:34px}
      .mmr .mmr-pad{flex:none;display:flex;flex-wrap:wrap;gap:3px;padding:2px 8px 6px}
      .mmr .mmr-pad .btn{flex:1 0 auto;min-width:40px;min-height:38px;padding:2px 6px}
      .mmr.mmr-dos{background:#000;color:var(--phos,#33ff66);font:clamp(15px,2.2vw,20px)/1.3 var(--dos);text-shadow:0 0 5px color-mix(in srgb,var(--phos,#33ff66) 50%,transparent)}
      .mmr.mmr-dos .mmr-st{background:var(--phos,#33ff66);color:#000;font:inherit;font-size:.95em;text-shadow:none}
      .mmr.mmr-dos .mmr-art{display:none}
      .mmr.mmr-dos .mmr-out{white-space:pre-wrap}
      .mmr.mmr-dos .mmr-out p{margin:0 0 .6em}
      .mmr.mmr-dos .mmr-out .mmr-cmd{color:inherit;font-style:normal;opacity:.75}
      .mmr.mmr-dos .mmr-out .mmr-rm{color:inherit;font-size:1em;text-decoration:underline}
      .mmr.mmr-dos .mmr-out .mmr-sys{color:inherit;font-style:normal;opacity:.7}
      .mmr.mmr-dos .mmr-out .mmr-big{color:inherit}
      .mmr.mmr-dos .mmr-out pre{font:inherit}
      .mmr.mmr-dos .mmr-in{border-top:1px solid var(--phos,#33ff66)}
      .mmr.mmr-dos .mmr-in b{font:inherit}
      .mmr.mmr-dos .mmr-in input{background:#000;color:inherit;border:0;border-bottom:1px dashed var(--phos,#33ff66);font:inherit;box-shadow:none;caret-color:var(--phos,#33ff66)}
      .mmr.mmr-dos .mmr-pad .btn{font-size:16px}
      .mmr.mmr-e2000 .mmr-st{background:linear-gradient(90deg,#4a2e5c,#8a4f7d)}
    `,
    open(W, api) {
      const dos = api.era.id === '1985';
      W.body.innerHTML = `<div class="mmr ${dos ? 'mmr-dos' : 'mmr-e' + api.era.id}">
        <div class="mmr-st"><span class="mmr-where"></span><span class="mmr-sc"></span></div>
        ${dos ? '' : '<div class="mmr-art" aria-hidden="true"><pre></pre></div>'}
        <div class="mmr-out" aria-live="polite"></div>
        <form class="mmr-in" autocomplete="off"><b>&gt;</b><input type="text" spellcheck="false" autocapitalize="characters" aria-label="Type a command" maxlength="60"><button class="btn" type="submit">Enter</button></form>
        <div class="mmr-pad">${[['N', 'n'], ['S', 's'], ['E', 'e'], ['W', 'w'], ['Up', 'u'], ['Down', 'd'], ['Look', 'look'], ['Inv', 'i'], ['Map', 'map'], ['Hint', 'hint']].map(([l, c]) => `<button class="btn" type="button" data-c="${c}">${l}</button>`).join('')}</div>
      </div>`;
      const root = W.body.firstElementChild;
      const outEl = root.querySelector('.mmr-out'), input = root.querySelector('input'), whereEl = root.querySelector('.mmr-where'), scEl = root.querySelector('.mmr-sc');
      const artEl = root.querySelector('.mmr-art pre');
      let showArt = api.load('art', true);
      const artBox = root.querySelector('.mmr-art');

      let S = null, pending = null, last = '', hist = [], hi = 0;

      /* ---------- output ---------- */
      function print(text, cls) {
        const p = document.createElement(cls === 'pre' ? 'pre' : 'p');
        if (cls && cls !== 'pre') p.className = cls;
        p.textContent = text;
        outEl.appendChild(p);
        while (outEl.childNodes.length > 300) outEl.firstChild.remove();
      }
      const scrollDown = () => { outEl.scrollTop = outEl.scrollHeight; };
      function status() {
        whereEl.textContent = R[S.room].n;
        scEl.textContent = `Score: ${S.score}/${MAX}   Moves: ${S.moves}`;
        if (artEl) {
          artBox.style.display = showArt ? '' : 'none';
          artEl.textContent = (lit() ? ART[S.room] || ART[ARTFOR[S.room]] || ART.hall : ART.dark).replace(/^\n/, '');
        }
      }

      /* ---------- state ---------- */
      function fresh() {
        const at = {}; Object.entries(O).forEach(([k, o]) => { at[k] = o.at; });
        return { room: 'gate', at, f: {}, pts: {}, score: 0, moves: 0, seen: {}, hint: {}, won: false };
      }
      const here = id => S.at[id] === S.room;
      const has = id => S.at[id] === 'inv';
      const lit = () => !R[S.room].dark || (S.f.lit && has('flashlight'));
      const visible = id => has(id) || (here(id) && (lit() || id === 'flashlight'));
      function award(key) {
        if (S.pts[key]) return;
        S.pts[key] = true; S.score += PTS[key];
        api.sfx.blip(1046);
        print(`[Your score just went up by ${PTS[key]} points.]`, 'mmr-sys');
        const ms = api.load('ms', []);
        [25, 50, 75, 100].forEach(m => { if (S.score >= m && !ms.includes(m)) { ms.push(m); api.earn(1, `reaching ${m} points in Maple Manor`); } });
        api.save('ms', ms);
      }
      const exitsOf = id => Object.keys(R[id].ex);
      function describe(full) {
        const r = R[S.room];
        print(r.n, 'mmr-rm');
        if (!lit()) {
          print('It is pitch dark. You can\'t see a thing. Something drips somewhere. You\'d better find a light before exploring down here.' + ` Exits you remember: ${exitsOf(S.room).map(d => DIRNAME[d]).join(', ')}.`);
          return;
        }
        print(r.d(S));
        const things = Object.keys(O).filter(k => here(k) && !O[k].fixed);
        if (S.f.follow && S.room !== 'crawl') print('The raccoon trots along behind you, looking very pleased.');
        if (S.room === 'gate' && S.f.settled && !S.f.won) print('Aunt Mabel is here, waving at you!');
        if (things.length) print('You can see: ' + things.map(k => O[k].n).join(', ') + '.');
        print('Exits: ' + exitsOf(S.room).map(d => DIRNAME[d]).join(', ') + '.', 'mmr-sys');
      }
      function enter(id, msg) {
        if (msg) print(msg);
        S.room = id;
        if (S.f.follow) S.at.raccoon = id;
        const firstTime = !S.seen[id];
        describe(false);
        S.seen[id] = true;
        if (id === 'attic' && firstTime) api.sfx.knock();
        if (S.f.settled && !S.f.mabelNote && R[id].out) { S.f.mabelNote = true; print('HONK HONK! A car horn toots at the front gate. Aunt Mabel is home from the fair!', 'mmr-big'); api.sfx.ding(); }
        maybeSettle();
      }
      function maybeSettle() {
        if (S.room === 'tree' && S.f.follow && S.at.blanket === 'crate' && !S.f.settled) {
          S.f.settled = true; S.f.follow = false; S.at.raccoon = 'tree'; S.at.mabel = 'gate';
          print('The raccoon sniffs the crate, climbs in, turns around three times and snuggles into the blanket. It lets out a happy little chirr and closes its eyes. It has a real home at last: dry, cozy and all its own. And no more midnight thumping in Aunt Mabel\'s attic!', 'mmr-big');
          api.sfx.tada();
          award('settled');
        }
      }

      /* ---------- the parser ---------- */
      function matchObjs(words, pref) {
        const text = ' ' + words.join(' ') + ' ';
        const scope = Object.keys(O).filter(visible);
        const hits = [];
        scope.forEach(id => O[id].w.forEach(name => {
          let i = text.indexOf(' ' + name + ' ');
          while (i >= 0) { hits.push({ i, len: name.length, id }); i = text.indexOf(' ' + name + ' ', i + 1); }
        }));
        hits.sort((a, b) => a.i - b.i || b.len - a.len || pref(a.id) - pref(b.id));
        const outL = []; let end = -1;
        hits.forEach(h => { if (h.i <= end && outL.length) return; if (!outL.includes(h.id)) outL.push(h.id); end = h.i + h.len; });
        return outL;
      }
      function knownWord(words) {
        const text = ' ' + words.join(' ') + ' ';
        return Object.keys(O).some(id => O[id].w.some(n => text.includes(' ' + n + ' ')));
      }
      function normalize(raw) {
        let s = ' ' + raw.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
        const rep = [
          [/^ (turn|switch|flick|click) on (.+)/, ' light $2'], [/^ (turn|switch|flick|click) (.+) on $/, ' light $2 '],
          [/^ (turn|switch|flick|click) off (.+)/, ' unlight $2'], [/^ (turn|switch|flick|click) (.+) off $/, ' unlight $2 '],
          [/^ pick up (.+)/, ' take $1'], [/^ pick (.+) up $/, ' take $1 '],
          [/^ look at (.+)/, ' examine $1'], [/^ look (in|inside|into) (.+)/, ' search $2'],
          [/^ look (under|beneath|behind|below) (.+)/, ' lookunder $2'], [/^ (search|check) (under|beneath|behind) (.+)/, ' lookunder $3'],
          [/^ put on (.+)/, ' wear $1'], [/^ put down (.+)/, ' drop $1'],
          [/^ (climb|go|walk|run) (up|down) (the )?(stairs|steps|ladder|staircase|tree|rope ladder) $/, ' $2 '],
          [/^ (climb|go) (up|down) $/, ' $2 '],
          [/^ (go|walk|run|head|travel) (to the |to )?/, ' go '],
          [/^ (talk|speak|say hello|say hi|chat) (to|with) (.+)/, ' talk $3'],
          [/^ wind up (.+)/, ' wind $1'], [/^ (set|turn) (the )?(dials?|lock|padlock) to (.+)/, ' dial $4'],
          [/^ (turn|rotate) (the )?(dials?) (.+)/, ' dial $4'],
          [/^ (squeeze|squeak) (.+)/, ' squeeze $2']
        ];
        rep.forEach(([re, to]) => { s = s.replace(re, to); });
        return s.trim().split(' ').filter(Boolean);
      }

      function run(raw) {
        raw = raw.trim();
        if (!raw) { print('Type a command, like LOOK or GO NORTH. Type HELP for more.', 'mmr-sys'); return; }
        print('> ' + raw.toUpperCase(), 'mmr-cmd');
        if (pending) { const p = pending; pending = null; p(raw.trim().toLowerCase()); return; }
        let words = normalize(raw);
        if (!words.length) { print('I beg your pardon?'); return; }
        let v = VERB[words[0]] || (DIRS[words[0]] ? 'dir' : null);
        if (v === 'again') { if (!last) { print('Again? You haven\'t done anything yet!'); return; } words = normalize(last); v = VERB[words[0]] || (DIRS[words[0]] ? 'dir' : null); print('(' + last.toUpperCase() + ')', 'mmr-sys'); }
        else last = raw;
        if (S.won && !['restart', 'score', 'help', 'load', 'map', 'look', 'inventory'].includes(v)) { print('The mystery is solved! Type RESTART to play again, or LOAD to go back to a saved game.'); return; }
        const rest = words.slice(1);
        const nouns = rest.filter(w => !STOP.has(w));
        if (v === 'go' || v === 'dir') {
          let d = v === 'dir' ? DIRS[words[0]] : null;
          if (v === 'go') {
            const dw = rest.find(w => DIRS[w]);
            if (dw) d = DIRS[dw];
            else if (/^(enter|in|inside)$/.test(words[0]) || rest.some(w => /^(inside|in|house|door)$/.test(w))) d = R[S.room].inDir;
            else if (/^(exit|leave|out|outside)$/.test(words[0]) || rest.some(w => /^(outside|out)$/.test(w))) d = R[S.room].outDir;
            if (!d && words[0] === 'enter' && rest.some(w => /^\d+$/.test(w))) { v = 'dial'; }
            else if (!d && rest.length && matchObjs(rest, () => 0).length) { print('You\'re already right next to it. Try a direction, like NORTH.'); return; }
          }
          if (v !== 'dial') {
            if (!d) { print('Which way? Try NORTH, SOUTH, EAST, WEST, UP or DOWN.'); return; }
            tick(); go(d); return;
          }
        }
        if (!v) {
          if (knownWord(words)) print(`I don't know how to "${words[0].toUpperCase()}" things. Type HELP for a list of verbs.`);
          else print(`I don't know the word "${words[0].toUpperCase()}". Type HELP for some ideas.`);
          return;
        }
        const meta = { inventory: 1, score: 1, save: 1, load: 1, restart: 1, hint: 1, help: 1, map: 1, quit: 1, look: 1 };
        if (!meta[v]) tick();
        const pref = v === 'take' ? id => (has(id) ? 1 : 0) : id => (has(id) ? 0 : 1);
        const objs = matchObjs(rest, pref);
        if (v === 'look' && objs.length) return verbs.examine(objs[0], objs[1], nouns);
        if (nouns.length && !objs.length && !['dial', 'hint', 'save', 'load', 'look', 'magic', 'break', 'knock', 'talk', 'yell', 'sing', 'help', 'listen', 'smell', 'wait', 'jump', 'sleep', 'climb', 'take', 'drop', 'turn', 'use'].includes(v)) {
          if (!lit()) { print('It\'s too dark to see anything like that.'); return; }
          print(knownWord(rest) ? 'You don\'t see that here.' : `I don't know the word "${nouns[nouns.length - 1].toUpperCase()}".`);
          return;
        }
        (verbs[v] || (() => print('Nothing happens.')))(objs[0], objs[1], nouns, rest);
      }
      function tick() { S.moves++; }
      function go(d) {
        const r = R[S.room], to = r.ex[d];
        if (!to) { print(api.pick(['You can\'t go that way.', 'There\'s no way to go ' + DIRNAME[d] + ' from here.', 'A wall politely blocks your way.'])); return; }
        // Locked and blocked ways.
        if (S.room === 'porch' && d === 'n' && !S.f.door) { print('The front door is locked. There\'s a note pinned to it.'); return; }
        if (S.room === 'backyard' && d === 'e' && !S.f.backdoor) { print('The back door is bolted from the inside.'); return; }
        if (S.room === 'kitchen' && d === 'w' && !S.f.backdoor) { S.f.backdoor = true; enter(to, 'You slide back the bolt and step out the back door.'); return; }
        if (S.room === 'kitchen' && d === 'd' && !S.f.cellar) { print('The cellar door is painted shut. It won\'t budge from this side.'); return; }
        if (S.room === 'cellar' && d === 'u' && !S.f.cellar) { S.f.cellar = true; api.sfx.door(); enter(to, 'You climb the stairs and push the door hard. With a CRACK of old paint, it pops open. You tumble into the kitchen!'); return; }
        if (S.room === 'library' && d === 'd' && !S.f.shelf) { print('You can\'t go down through the floor. Well, not without a secret passage.'); return; }
        if (S.room === 'roses' && d === 'e' && !S.f.shed) { print('The shed door is locked with a number padlock.'); return; }
        if (S.room === 'landing' && d === 'u' && !S.f.hatch) { print('The attic hatch is in the ceiling, way out of reach.'); return; }
        if (S.room === 'oak' && d === 'u' && !S.f.ropeLadder) { print('The trunk is too wide and smooth to climb, and the rope ladder is rolled up high out of reach.'); return; }
        if (R[to].dark && !R[S.room].dark && !(S.f.lit && has('flashlight'))) {
          if (!has('flashlight') || !S.f.batteries) { print('It\'s pitch black down there. You don\'t want to go stumbling around in the dark. You need a light!'); return; }
          print('It\'s pitch black that way. You might want to TURN ON your FLASHLIGHT first.'); return;
        }
        if (d === 'u' || d === 'd') api.sfx.seek(2); else api.sfx.key();
        enter(to);
      }

      const verbs = {
        look: () => describe(true),
        inventory: () => {
          const inv = Object.keys(O).filter(has);
          print(inv.length ? 'You are carrying: ' + inv.map(k => O[k].n + (k === 'flashlight' && S.f.lit ? ' (on)' : '')).join(', ') + '.' : 'You are empty-handed. Your pockets contain one piece of lint.');
          if (S.f.follow) print('A raccoon is following you. That doesn\'t count as carrying, but it\'s very cute.');
        },
        examine(o, o2, nouns) {
          if (!o) { if (nouns.length) { print('You don\'t see that here.'); return; } describe(true); return; }
          const d = O[o].d; print(typeof d === 'function' ? d(S) : d);
          if (o === 'flashlight' && !S.f.batteries) { /* hint lives in the text */ }
          if (o === 'redbook' || o === 'shelves') S.f.sawBook = true;
        },
        search(o) {
          if (!o) { print('Search what?'); return; }
          if (o === 'drawer') return verbs.open(o);
          if (o === 'bench') return verbs.open(o);
          if (o === 'cabinet') return verbs.open(o);
          if (o === 'mat') return verbs.lookunder(o);
          if (o === 'stash') { print(O.stash.d(S)); return; }
          verbs.examine(o);
        },
        lookunder(o) {
          if (!o) { print('Look under what?'); return; }
          if (o === 'mat') {
            if (S.at.brasskey === null && !S.f.mat) { S.f.mat = true; S.at.brasskey = 'porch'; print('You lift the corner of the doormat. Underneath is a brass key! "Where everybody wipes their feet." Of course.'); award('mat'); }
            else print('Just dust and one very startled beetle.');
            return;
          }
          if (o === 'bed') { print('Dust bunnies. Enormous ones. One of them might be a small sheep.'); return; }
          print('You find nothing interesting under there.');
        },
        move(o) {
          if (o === 'mat') return verbs.lookunder(o);
          if (o === 'redbook' || o === 'shelves') return verbs.pull('redbook');
          if (o === 'globe') { print(O.globe.d); return; }
          if (o === 'swing') { print('Squeeeak... squeeeak. Relaxing, in a creaky way.'); return; }
          if (!o) { print('Move what?'); return; }
          print(O[o].fixed ? 'It won\'t budge.' : 'You shuffle it around a bit. Nothing happens.');
        },
        take(o, o2, nouns, rest) {
          if (rest && rest[0] === 'all') {
            const list = Object.keys(O).filter(k => here(k) && !O[k].fixed && lit());
            if (!list.length) { print('There\'s nothing here you can take.'); return; }
            list.forEach(k => { verbs.take(k); });
            return;
          }
          if (!o) { if (nouns.length) print(lit() ? 'You don\'t see that here.' : 'You fumble around in the dark but find nothing.'); else print('Take what?'); return; }
          if (has(o)) { print('You already have it.'); return; }
          if (o === 'locket') { S.at.locket = 'inv'; print('You gently pick up the silver locket. The raccoon doesn\'t mind at all. It\'s already found a shiny new bottle cap to admire.'); award('locket'); return; }
          if (o === 'raccoon') { print(S.f.friend ? 'The raccoon is too wiggly to carry, but it\'s happy to follow you around.' : 'The raccoon squeaks and scoots out of reach.'); return; }
          if (o === 'redbook') { print('You tug at the red book. It won\'t come off the shelf, but it tilts forward like a lever. Maybe try PULL BOOK.'); return; }
          if (o === 'mabel') { print('Aunt Mabel laughs. "I\'m not going anywhere, dear."'); return; }
          if (o === 'blanket' && S.at.blanket === 'crate') { print(S.f.settled ? 'The raccoon is sleeping on it. Leave it be!' : 'You take the blanket back out of the crate.'); if (!S.f.settled) S.at.blanket = 'inv'; return; }
          if (O[o].fixed) { print(api.pick(['That\'s not something you can carry.', 'It\'s much too heavy. Or too attached to the house. Or both.', 'You can\'t take that.'])); return; }
          S.at[o] = 'inv'; api.sfx.click();
          print(`Taken: ${O[o].n}.`);
        },
        drop(o) {
          if (!o) { print('Drop what?'); return; }
          if (!has(o)) { print('You aren\'t carrying that.'); return; }
          if (o === 'blanket' && S.room === 'tree') return verbs.put('blanket', 'crate');
          if (o === 'coin' && S.room === 'eastlawn') return verbs.throw('coin');
          S.at[o] = S.room;
          print('Dropped.');
        },
        read(o) {
          if (!o) { print('Read what?'); return; }
          if (o === 'note') { print('"Dear Nephew or Niece (I never can remember which of you is visiting this week!),\n\nI\'ve gone to the county fair to judge the pie contest. Make yourself at home. The spare key is where everybody wipes their feet.\n\nP.S. If you hear the GHOST, don\'t be scared. I\'m sure there\'s a perfectly good explanation.\n\nLove, Aunt Mabel"'); return; }
          if (o === 'journal') {
            if (!has('glasses')) { print('You open the journal. Aunt Mabel\'s handwriting is SO tiny it looks like ants marching across the page. You need reading glasses!'); return; }
            print('You put on the reading glasses. The tiny writing becomes big and clear:\n\n"Something thumps around in the attic every night. Cookies vanish. Three spoons are gone, and now even Mother\'s silver locket! I can\'t reach the attic since the hatch cord snapped. The hooked pole is somewhere down in the cellar, but that cellar door has been painted shut for years.\n\nGrandpa Horace always said the library hides his secret stair: \'Pull the red book, and down you go.\' He used it to sneak midnight snacks, the rascal. I\'ll need a flashlight for that. Batteries? Maybe the old toy robot..."');
            award('journal'); return;
          }
          if (o === 'calendar') { S.f.code = true; }
          if (O[o].read || o === 'calendar' || o === 'sign' || o === 'music') { print(typeof O[o].d === 'function' ? O[o].d(S) : O[o].d); return; }
          if (o === 'redbook' || o === 'shelves') { print('You read a few pages of "Secrets of Old Houses": "Many old houses have hidden passages, opened by a lever disguised as a book..." How interesting.'); return; }
          print('There\'s nothing written on it.');
        },
        open(o, o2) {
          if (!o) { print('Open what?'); return; }
          switch (o) {
            case 'door':
              if (S.f.door) { print('It\'s already open.'); return; }
              if (has('brasskey')) return verbs.unlock('door');
              print('It\'s locked. There\'s a note pinned to it.'); return;
            case 'drawer':
              if (S.f.kdrawer) { print('It\'s already open.'); return; }
              S.f.kdrawer = true; S.at.flashlight = 'kitchen';
              print('You open the drawer. Among the string, rubber bands and twist ties is a flashlight!'); return;
            case 'ddrawer': case 'desk':
              if (S.f.drawer) { print('It\'s already open.'); return; }
              if (has('silverkey')) return verbs.unlock('ddrawer');
              print('It\'s locked. The keyhole is small and silver.'); return;
            case 'bench':
              if (S.f.bench) { print('It\'s already open.'); return; }
              S.f.bench = true; S.at.windkey = 'parlor'; S.at.music = 'parlor';
              print('You lift the lid of the piano bench. Inside is some sheet music and a brass winding key with a butterfly-shaped handle!'); award('bench'); return;
            case 'cabinet':
              if (S.f.cabinet) { print('It\'s already open.'); return; }
              S.f.cabinet = true; S.at.glasses = 'bath';
              print('You open the medicine cabinet. Toothpaste, bandages, a comb, and a pair of reading glasses.'); return;
            case 'robot':
              if (S.f.robot) { print('The battery hatch is already open.'); return; }
              if (!has('screwdriver')) { print('The battery hatch is held shut by a tiny screw. Your fingernails aren\'t up to the job. You need a screwdriver.'); return; }
              S.f.robot = true; S.at.batteries = 'playroom';
              print('You carefully undo the tiny screw with the screwdriver. The hatch pops open: two batteries inside! "BEEP," says the robot, sadly.'); return;
            case 'padlock':
              if (S.f.shed) { print('It\'s already open.'); return; }
              print('It needs a three-number combination. Type it like this: DIAL 123.'); return;
            case 'clock':
              if (S.f.clock) { print('The little door is already open.'); return; }
              print('The little door at the bottom of the clock is locked tight. Maybe the clock itself has a trick to it.'); return;
            case 'hatch':
              return verbs.pull('hatch');
            case 'cellardoor':
              if (S.f.cellar) { print('It\'s already open.'); return; }
              print('You tug and tug. It\'s painted shut. It might open with a good push from the other side.'); return;
            case 'backdoor':
              S.f.backdoor = true; print('You slide back the bolt. The back door is unbolted.'); return;
            case 'wardrobe': case 'jewelbox': case 'horse':
              print(O[o].d); return;
            case 'musicbox':
              return verbs.play('musicbox');
            case 'trunks': print('Old clothes, a top hat, and a pair of roller skates. Nothing useful for now.'); return;
            case 'locket': print(O.locket.d); return;
            case 'journal': return verbs.read('journal');
            case 'crate': print(O.crate.d(S)); return;
            case 'well': print('It\'s a well. It\'s already as open as it gets.'); return;
          }
          print('You can\'t open that.');
        },
        close(o) { if (!o) { print('Close what?'); return; } print(O[o].fixed ? 'Better leave it the way it is.' : 'It doesn\'t close.'); },
        unlock(o) {
          if (!o) { print('Unlock what?'); return; }
          if (o === 'door') {
            if (S.f.door) { print('It\'s already unlocked and open.'); return; }
            if (!has('brasskey')) { print('You need a key for that.'); return; }
            S.f.door = true; api.sfx.door();
            print('The brass key turns with a satisfying CLUNK. The front door swings open with a looong, spooky creeeeak. (Doors in old houses always do that. It\'s the law.)'); award('door'); return;
          }
          if (o === 'ddrawer' || o === 'desk') {
            if (S.f.drawer) { print('It\'s already unlocked.'); return; }
            if (!has('silverkey')) { print(has('brasskey') || has('windkey') ? 'That key is much too big for this little keyhole.' : 'You need a small key for that.'); return; }
            S.f.drawer = true; S.at.journal = 'study'; api.sfx.click();
            print('The little silver key fits perfectly. Click! Inside the drawer is Aunt Mabel\'s green leather journal.'); award('drawer'); return;
          }
          if (o === 'padlock') return verbs.open('padlock');
          if (o === 'clock') return verbs.open('clock');
          if (o === 'cellardoor') return verbs.open('cellardoor');
          if (o === 'backdoor') return verbs.open('backdoor');
          print('It doesn\'t have a lock.');
        },
        dial(o, o2, nouns, rest) {
          const digits = (rest || []).join('').replace(/\D/g, '');
          if (S.room !== 'roses' && S.room !== 'shed') { print('There\'s nothing here to dial.'); return; }
          if (S.f.shed) { print('The padlock is already open.'); return; }
          if (digits.length !== 3) { print('The padlock has three number dials. Try something like DIAL 123.'); return; }
          if (digits === '725') { S.f.shed = true; api.sfx.click(); print('Seven... two... five... CLICK! The padlock springs open. The shed door creaks open.'); award('shed'); return; }
          api.sfx.blip(200);
          print(`You set the dials to ${digits.split('').join('-')} and tug. Nope. The padlock stays shut.`);
        },
        use(o, o2, nouns) {
          if (!o) { print('Use what?'); return; }
          switch (o) {
            case 'brasskey': case 'silverkey': case 'windkey':
              if (S.room === 'hall' && has('windkey') && !S.f.clock) return verbs.wind('clock');
              if (S.room === 'study' && has('silverkey') && !S.f.drawer) return verbs.unlock('ddrawer');
              if (S.room === 'porch' && has('brasskey')) return verbs.unlock('door');
              print('There\'s nothing here that key fits.'); return;
            case 'screwdriver': return S.room === 'playroom' ? verbs.open('robot') : print('There are no tiny screws here that need undoing.');
            case 'oilcan': return verbs.oil(o2 && o2 !== 'oilcan' ? o2 : S.room === 'playroom' || has('musicbox') ? 'musicbox' : null);
            case 'batteries': return verbs.put('batteries', 'flashlight');
            case 'flashlight': return S.f.lit ? verbs.unlight('flashlight') : verbs.light('flashlight');
            case 'musicbox': return verbs.play('musicbox');
            case 'apple': return verbs.give('apple', o2 || 'raccoon');
            case 'glasses': return verbs.wear('glasses');
            case 'pole': return verbs.pull(S.room === 'oak' ? 'ropeladder' : 'hatch');
            case 'blanket': return verbs.put('blanket', 'crate');
            case 'coin': return verbs.throw('coin');
            case 'locket': return verbs.give('locket', 'mabel');
            case 'redbook': return verbs.pull('redbook');
            case 'padlock': return verbs.open('padlock');
            case 'telescope': case 'piano': case 'clock': return verbs[o === 'clock' ? 'wind' : o === 'piano' ? 'play' : 'examine'](o);
            case 'duck': return verbs.squeeze('duck');
            case 'journal': return verbs.read('journal');
          }
          print('You can\'t think of a way to use that here.');
        },
        wind(o) {
          if (!o) { print('Wind what?'); return; }
          if (o === 'musicbox') { print(S.f.oiled ? 'You wind it up. Try PLAY MUSIC BOX.' : 'You try to wind it. SQUEEEAAAK. The gears are rusty and stuck. They need oil!'); return; }
          if (o !== 'clock' && o !== 'windkey') { print('That doesn\'t wind.'); return; }
          if (S.room !== 'hall') { print('There\'s no clock here to wind.'); return; }
          if (S.f.clock) { print('It\'s already wound and ticking happily.'); return; }
          if (!has('windkey')) { print('There\'s a keyhole on the clock face for winding it, but you don\'t have a winding key.'); return; }
          S.f.clock = true; S.at.silverkey = 'hall';
          print('You fit the winding key into the clock face and turn it: crick, crick, crick. The pendulum starts to swing. Tick... tock... Then: BONG! BONG! BONG! The clock chimes twelve times, and the little door at the bottom of the case pops open. A small silver key tumbles out onto the floor!');
          [0, 0.7, 1.4].forEach(t => api.tone(196, 1.2, { at: t, type: 'sine', vol: 0.1, decay: 1 }));
          award('clock');
        },
        turn(o, o2, nouns, rest) {
          if ((rest || []).some(w => /\d/.test(w))) return verbs.dial(o, o2, nouns, rest);
          if (o === 'clock' || o === 'windkey') return verbs.wind('clock');
          if (o === 'flashlight') return S.f.lit ? verbs.unlight(o) : verbs.light(o);
          if (o === 'globe') { print(O.globe.d); return; }
          if (o === 'padlock') { print('Type the combination like this: DIAL 123.'); return; }
          if (o === 'brasskey') return verbs.unlock('door');
          if (o === 'silverkey') return verbs.unlock('ddrawer');
          print(o ? 'Turning it doesn\'t do anything.' : 'Turn what?');
        },
        pull(o) {
          if (!o) { print('Pull what?'); return; }
          if (o === 'redbook' || o === 'shelves') {
            if (S.room !== 'library') { print('Pull what?'); return; }
            if (S.f.shelf) { print('The bookshelf is already open.'); return; }
            S.f.shelf = true; api.sfx.door();
            print('You pull the red book. Click... grrrrrind... The whole bookshelf swings out like a door! Behind it, narrow stone steps lead DOWN into darkness. Grandpa Horace\'s secret stair!'); award('shelf'); return;
          }
          if (o === 'hatch') {
            if (S.f.hatch) { print('The hatch is already open, ladder and all.'); return; }
            if (!has('pole')) { print('You jump. You stretch. You can\'t reach it. You need something long, with a hook.'); return; }
            S.f.hatch = true; api.sfx.seek(4);
            print('You hook the pole onto the hatch and pull. The hatch swings down and a folding ladder slides out with a CLATTER. The way UP to the attic is open! Dust sprinkles on your head. From above, something goes scritch-scratch... then silence.'); award('hatch'); return;
          }
          if (o === 'ropeladder') {
            if (S.f.ropeLadder) { print('It\'s already hanging down.'); return; }
            if (!has('pole')) { print('It\'s tied up far too high for you to reach. Something long with a hook would help.'); return; }
            S.f.ropeLadder = true;
            print('You reach up with the hooked pole, snag the knot and give it a tug. The rope ladder tumbles down with a flop. Now you can climb UP to the treehouse!'); award('ropeLadder'); return;
          }
          if (o === 'mat') return verbs.lookunder('mat');
          print(O[o].fixed ? 'You pull, but nothing happens.' : 'You tug on it. Nothing happens.');
        },
        play(o) {
          if (!o) { print('Play what?'); return; }
          if (o === 'piano') { api.midi && [60, 62, 64, 65, 67].forEach((n, i) => api.tone(api.midi(n), 0.25, { at: i * 0.2, vol: 0.06, type: 'triangle', decay: 1 })); print(has('music') || here('music') ? 'You play "Hush, Little Critter" from the sheet music. It\'s a soft, pretty lullaby. Far above you, something goes "chrrr?"' : 'You plink out a tune. It sounds like a cat walking on the keys, but with feeling.'); return; }
          if (o === 'music') return verbs.play('piano');
          if (o === 'musicbox') {
            if (!has('musicbox') && !here('musicbox')) { print('You don\'t have it.'); return; }
            if (!S.f.oiled) { print('You try to wind it. SQUEEEEEEAAAAK! The gears are rusty and stuck. It needs oil.'); api.tone(1800, 0.3, { to: 2400, vol: 0.04, type: 'sawtooth' }); return; }
            [72, 71, 69, 67, 69, 71, 72, 67].forEach((n, i) => api.tone(api.midi(n), 0.3, { at: i * 0.32, vol: 0.05, type: 'sine', decay: 1 }));
            if (S.room === 'crawl' && lit() && !S.f.coax) {
              S.f.coax = true;
              print('You wind the music box and it tinkles out a gentle lullaby. The raccoon\'s ears perk up. Slowly, slowly, it creeps out from behind the treasure pile and sways back and forth to the music. It sniffs the air. It looks at you. It looks... hungry.');
              award('coax'); return;
            }
            print('The music box plays a gentle lullaby, and the tiny bear on top twirls around. Lovely.'); return;
          }
          print('That\'s not something you can play.');
        },
        oil(o, o2) {
          if (!has('oilcan')) { print('You don\'t have any oil.'); return; }
          if (!o || o === 'oilcan') o = o2;
          if (!o) { print('Oil what?'); return; }
          if (o === 'musicbox') {
            if (S.f.oiled) { print('It\'s oiled already. Any more and it\'ll slide right off the shelf.'); return; }
            if (!has('musicbox') && !here('musicbox')) { print('You don\'t see it here.'); return; }
            S.f.oiled = true;
            print('You put a drop of oil on each of the music box\'s gears. You give it a test wind... it plays a sweet little lullaby, and the tiny bear on top twirls! Squeak-free!'); award('oiled'); return;
          }
          if (o === 'swing') { print('You oil the porch swing. Now it doesn\'t squeak. It\'s much less spooky, and a tiny bit less fun.'); return; }
          if (o === 'clock') { print('The clock isn\'t squeaky, just stopped. It needs winding.'); return; }
          if (o === 'robot') { print('The robot doesn\'t squeak. It just needs its batteries... or maybe you need them more.'); return; }
          print('That doesn\'t need oiling.');
        },
        light(o) {
          if (!o) o = has('flashlight') ? 'flashlight' : null;
          if (o !== 'flashlight') { print(o ? 'That\'s not something you can light. (And please don\'t light things on fire!)' : 'Light what?'); return; }
          if (!has('flashlight')) { print('You need to be holding it.'); return; }
          if (!S.f.batteries) { print('Click. Click. Nothing. The flashlight has no batteries!'); return; }
          if (S.f.lit) { print('It\'s already on.'); return; }
          S.f.lit = true; api.sfx.click();
          print('Click! A bright beam of light shines out.');
          if (R[S.room].dark) describe(true);
        },
        unlight(o) {
          if (!S.f.lit) { print('It\'s already off.'); return; }
          S.f.lit = false; api.sfx.click(); print('Click. The flashlight is off.' + (R[S.room].dark ? ' Everything goes pitch dark!' : ''));
        },
        put(o, o2) {
          if (!o) { print('Put what?'); return; }
          if (!has(o)) { print('You aren\'t carrying that.'); return; }
          if (o === 'batteries') {
            if (!has('flashlight') && !here('flashlight')) { print('Put them in what? Batteries are only useful in something that needs them.'); return; }
            S.at.batteries = 'gone'; S.f.batteries = true; api.sfx.click();
            print('You slide the batteries into the flashlight and screw the cap back on. Now type TURN ON FLASHLIGHT.'); award('batteries'); return;
          }
          if (o === 'blanket' && (o2 === 'crate' || S.room === 'tree')) {
            if (S.room !== 'tree') { print('You don\'t see a crate here.'); return; }
            S.at.blanket = 'crate';
            print('You tuck the patchwork blanket into the crate and fluff it up. It looks like the coziest bed in the whole world.');
            if (!S.f.follow && !S.f.friend) print('Now it just needs someone to sleep in it.');
            else if (!S.f.follow) print('Now it just needs a certain someone to find it...');
            maybeSettle(); return;
          }
          if (o === 'coin' && (o2 === 'well' || S.room === 'eastlawn')) return verbs.throw('coin');
          if (o === 'apple' && o2 === 'raccoon') return verbs.give('apple', 'raccoon');
          if (o === 'glasses') return verbs.wear('glasses');
          if (o2) { print('That doesn\'t fit in there.'); return; }
          return verbs.drop(o);
        },
        give(o, o2) {
          if (!o) { print('Give what?'); return; }
          if (!has(o)) { print('You don\'t have that.'); return; }
          if (!o2) o2 = here('raccoon') ? 'raccoon' : here('mabel') ? 'mabel' : null;
          if (!o2) { print('There\'s nobody here to give it to.'); return; }
          if (o2 === 'raccoon') {
            if (!lit() || !here('raccoon')) { print('You don\'t see anyone here to give it to.'); return; }
            if (S.f.settled) { print('The raccoon is fast asleep. Let it snooze.'); return; }
            if (S.f.friend) { print(o === 'apple' ? '' : 'The raccoon sniffs it politely, then gives it back. It prefers shiny things and snacks.'); return; }
            if (o !== 'apple') { print(o === 'locket' ? 'The raccoon clutches the locket happily. Hmm. Maybe find it a better present.' : 'The raccoon sniffs it and looks unimpressed. It seems hungry for something tasty.'); return; }
            if (!S.f.coax) { print('You hold out the apple, but the raccoon is too nervous to come out from behind its treasure pile. Maybe something soothing first?'); return; }
            S.at.apple = 'gone'; S.f.friend = true; S.f.follow = true; S.at.locket = 'crawl';
            print('You hold out the red apple. The raccoon takes it in its tiny hands, turns it around twice, and munches it happily, crunch crunch crunch. Then it climbs onto your shoe and chirrs. You have a new friend!\n\nThe raccoon proudly pushes its treasure pile toward you: three silver spoons, bottle caps, a clothespin... and a silver LOCKET.\n\nThe poor thing was just lonely, hungry and looking for a warm place to live. That\'s your "ghost"!');
            api.sfx.tada(); award('friend'); return;
          }
          if (o2 === 'mabel') {
            if (o !== 'locket') { print('Aunt Mabel smiles. "Why, thank you, dear, but you keep that."'); return; }
            S.at.locket = 'gone'; S.f.won = true; award('won'); win(); return;
          }
          print('Nobody here wants that.');
        },
        shake(o) {
          if (o === 'appletree' || (!o && S.room === 'orchard')) {
            if (S.f.apple) { print('You shake the tree. A few leaves flutter down. No more apples.'); return; }
            S.f.apple = true; S.at.apple = 'orchard';
            print('You grab the skinny trunk and shake it hard. Leaves rain down, and then... THUNK! A big red apple drops right at your feet.'); award('apple'); return;
          }
          if (o === 'oaktree') { print('It\'s an enormous oak. It doesn\'t even notice.'); return; }
          if (o === 'musicbox') { print('It rattles a little. Shaking isn\'t going to fix it.'); return; }
          if (o === 'mabel') { print('You shake Aunt Mabel\'s hand. "Pleased to meet you too!" she giggles.'); return; }
          print(o ? 'You shake it. Nothing happens.' : 'Shake what?');
        },
        climb(o) {
          if (S.room === 'oak') return go('u');
          if (S.room === 'tree') return go('d');
          if (S.room === 'orchard') { print('The branches are far too thin to climb. Maybe you could SHAKE the tree instead.'); return; }
          if (S.room === 'hall') return go('u');
          if (S.room === 'landing') return go(S.f.hatch ? 'u' : 'd');
          if (S.room === 'attic') return go('d');
          if (S.room === 'passage' || S.room === 'cellar') return go('u');
          print('There\'s nothing here to climb.');
        },
        wear(o) {
          if (o !== 'glasses') { print(o ? 'That\'s not something you can wear.' : 'Wear what?'); return; }
          if (!has('glasses')) { print('You don\'t have them.'); return; }
          print('You put on the reading glasses. Everything up close looks ENORMOUS. Your own hand looks like a baseball mitt. Tiny writing will be easy to read now.');
        },
        eat(o) {
          if (o === 'apple') { print('You\'re not hungry, and somebody else in this house might want it a lot more than you do.'); return; }
          if (o === 'orchids') { print('The sign says PLEASE DO NOT EAT THE ORCHIDS. You respect the sign.'); return; }
          if (o === 'herbs') { print('You nibble a mint leaf. Fresh!'); return; }
          if (o === 'jar') { print('The cookie jar is empty. Somebody beat you to it.'); return; }
          print(o ? 'That doesn\'t look very tasty.' : 'Eat what?');
        },
        smell(o) {
          if (o === 'roses' || o === 'herbs') { print(O[o].d); return; }
          if (S.room === 'crawl' && lit()) { print('It smells a bit like wet dog and old cookies. Yep: a raccoon lives here.'); return; }
          print(R[S.room].out ? 'Fresh air, cut grass and a hint of roses.' : 'It smells like an old house: dust, lemon polish, and a faint whiff of cookies.');
        },
        listen() {
          if (S.room === 'attic' && !S.f.friend) { print('Scritch... scratch... a little chittering sound from the north. Is the ghost... giggling?'); return; }
          if (S.room === 'crawl' && !S.f.friend) { print('A nervous, chattering little "churr-churr".'); return; }
          if (S.room === 'hall') { print(S.f.clock ? 'Tick... tock... tick... tock.' : 'Silence. The clock isn\'t ticking.'); return; }
          if (S.room === 'boiler') { print('The furnace rumbles: BRRRRRMMMM.'); return; }
          if (R[S.room].out) { print('Birds chirp. Leaves rustle. The wind chime tinkles.'); return; }
          print('The old house creaks and settles. Somewhere above you, something small goes thump.');
        },
        talk(o) {
          if (o === 'raccoon' || (!o && here('raccoon') && lit())) { print(S.f.settled ? 'The raccoon mumbles "chrrr" in its sleep.' : S.f.friend ? 'The raccoon chirrs back at you. You\'re pretty sure it said "best friends forever".' : 'You say "Hello there, little ghost." The raccoon chitters and hides. It seems shy. Maybe some music would help.'); return; }
          if (o === 'mabel' || (!o && here('mabel'))) { print(has('locket') ? '"Hello, dear! Did you get to the bottom of the ghost business? I\'m still heartbroken about Mother\'s locket..." (Maybe GIVE LOCKET TO MABEL?)' : '"Hello, dear! I won third prize for my rhubarb pie... well, I was the judge, so I gave it to Mrs. Olsen. Did you solve the mystery? Oh, and have you seen Mother\'s silver locket anywhere? It went missing."'); return; }
          if (o === 'portrait') { print('Great-Grandpa Horace says nothing. He\'s a painting. But his mustache seems to approve.'); return; }
          if (o === 'gnome') { print('The gnome says nothing. The gnome judges you silently.'); return; }
          if (o === 'duck') { print('"Quack," you say. The duck says nothing. It\'s a good listener.'); return; }
          print('You say "Hello?" Your voice echoes a little. Nobody answers.');
        },
        pet(o) {
          if (o === 'raccoon' || (!o && here('raccoon'))) { print(S.f.friend ? 'You gently pet the raccoon. Its fur is soft, and it chirrs happily. (In real life, never touch wild animals! This one is a very special storybook raccoon.)' : 'The raccoon is too shy. It backs away.'); return; }
          if (o === 'gnome') { print('You pat the gnome on the head. He seems slightly less judgmental.'); return; }
          print(o ? 'You give it a friendly pat.' : 'Pet what?');
        },
        knock() { print(S.room === 'porch' && !S.f.door ? 'Knock knock! Nobody answers. Aunt Mabel is at the fair, remember?' : 'Knock knock. Who\'s there? Nobody. Nobody who? Exactly.'); api.sfx.knock(); },
        wait() { print('Time passes. A leaf falls. Somewhere, a raccoon yawns.'); },
        throw(o) {
          if (o === 'coin') {
            if (!has('coin')) { print('You don\'t have it.'); return; }
            if (S.room !== 'eastlawn') { print('Better save it for a wishing well.'); return; }
            S.at.coin = 'gone'; print('You toss the penny into the wishing well and make a wish. Plink! Far away, a raccoon sneezes. That\'s probably a good sign.'); return;
          }
          print(o ? 'Better not throw things around in Aunt Mabel\'s house.' : 'Throw what?');
        },
        break() { print('Breaking things isn\'t the answer. Besides, Aunt Mabel would be very disappointed.'); },
        squeeze(o) { if (o === 'duck') { print('SQUEAK! The duck approves.'); api.tone(1400, 0.15, { to: 900, vol: 0.05 }); return; } print(o ? 'You give it a squeeze. It doesn\'t squeak.' : 'Squeeze what?'); },
        sleep() { print('Not now! There\'s a mystery to solve.'); },
        jump() { print('You jump up and down. The floorboards creak. From somewhere, something small jumps too.'); },
        sing() { print('You sing a little song. It\'s lovely. A bird outside joins in, slightly off-key.'); },
        yell() { print('You yell "BOO!" The house is silent. Then a tiny voice from somewhere far away goes "chrr?"'); },
        magic() { print('Nothing happens. Magic words don\'t work in Maple Manor. Good manners do, though!'); },
        score() { print(`Your score is ${S.score} out of ${MAX}, in ${S.moves} moves. ${rank()}`); },
        help() {
          print('HOW TO PLAY\nType short commands, then press Enter. Most commands are one or two words: a verb and a thing.\n\nMOVING: NORTH (or N), SOUTH (S), EAST (E), WEST (W), UP (U), DOWN (D)\nLOOKING: LOOK (L), EXAMINE CLOCK (X CLOCK), LOOK UNDER BED, READ NOTE\nTHINGS: TAKE LAMP, DROP LAMP, INVENTORY (I), OPEN DOOR, UNLOCK DOOR, USE KEY, PUT X IN Y, GIVE X TO Y\nOTHER VERBS: PULL, PUSH, WIND, PLAY, OIL, SHAKE, CLIMB, TURN ON, LISTEN, SMELL, TALK TO\nGAME: MAP, HINT, SCORE, SAVE, LOAD, RESTART, AGAIN (G)\n\nStuck? Type HINT. Your game saves automatically after every move.');
        },
        hint(o, o2, nouns, rest) {
          const open = PUZ.map((p, i) => [p, i]).filter(([p]) => p[1](S) && !p[2](S));
          const n = parseInt((rest || []).join(''), 10);
          if (!open.length) { print('You don\'t need any hints right now. Keep exploring!'); return; }
          if (n >= 1 && n <= open.length) {
            const [p, i] = open[n - 1];
            const lv = Math.min(3, (S.hint[i] || 0) + 1); S.hint[i] = lv;
            print(`HINT for "${p[0]}" (${lv} of 3):\n${p[3][lv - 1]}` + (lv < 3 ? `\n(Type HINT ${n} again for a bigger hint.)` : ''), 'mmr-sys');
            return;
          }
          if (open.length === 1) return verbs.hint(null, null, [], ['1']);
          print('Which puzzle do you want a hint for? Type HINT and the number:\n' + open.map(([p, i], k) => `  ${k + 1}. ${p[0]}${S.hint[i] ? ` (seen ${S.hint[i]} of 3)` : ''}`).join('\n'), 'mmr-sys');
        },
        map() {
          const z = R[S.room].z;
          const ids = Object.keys(R).filter(k => R[k].z === z && (S.seen[k] || k === S.room));
          const xs = ids.map(k => R[k].x), ys = ids.map(k => R[k].y);
          const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
          const at = (x, y) => ids.find(k => R[k].x === x && R[k].y === y);
          const lines = [];
          for (let y = y0; y <= y1; y++) {
            let row = '', below = '';
            for (let x = x0; x <= x1; x++) {
              const k = at(x, y);
              row += k ? (k === S.room ? '{' : '[') + R[k].ab.padEnd(5).slice(0, 5) + (k === S.room ? '}' : ']') : '       ';
              const e = k && R[k].ex.e, s = k && R[k].ex.s;
              if (x < x1) row += e && e === at(x + 1, y) ? '-' : ' ';
              below += (s && s === at(x, y + 1) ? '   |   ' : '       ') + (x < x1 ? ' ' : '');
            }
            lines.push(row.replace(/\s+$/, ''));
            if (y < y1) lines.push(below.replace(/\s+$/, ''));
          }
          const ud = ids.filter(k => R[k].ex.u || R[k].ex.d).map(k => `${R[k].ab}: ${[R[k].ex.u ? 'up' : '', R[k].ex.d ? 'down' : ''].filter(Boolean).join('/')}`);
          print(`MAP: ${FLOORS[z]}  ({ } = you are here)`, 'mmr-sys');
          print(lines.join('\n'), 'pre');
          if (ud.length) print('Stairs and ladders: ' + ud.join(', '), 'mmr-sys');
        },
        save(o, o2, nouns, rest) {
          const n = parseInt((rest || []).join(''), 10);
          if (n >= 1 && n <= 3) { saveSlot(n); return; }
          print('Save in which slot? Type 1, 2 or 3.\n' + slotList(), 'mmr-sys');
          pending = a => { const k = parseInt(a, 10); if (k >= 1 && k <= 3) saveSlot(k); else print('Save cancelled.', 'mmr-sys'); };
        },
        load(o, o2, nouns, rest) {
          const n = parseInt((rest || []).join(''), 10);
          if (n >= 1 && n <= 3) { loadSlot(n); return; }
          print('Load which slot? Type 1, 2 or 3.\n' + slotList(), 'mmr-sys');
          pending = a => { const k = parseInt(a, 10); if (k >= 1 && k <= 3) loadSlot(k); else print('Load cancelled.', 'mmr-sys'); };
        },
        restart() {
          print('Start a brand new game? Type YES to restart.', 'mmr-sys');
          pending = a => { if (/^y/.test(a)) newGame(); else print('OK, carrying on.', 'mmr-sys'); };
        },
        quit() { print('To stop playing, just ' + (dos ? 'press Esc' : 'close the window') + '. Your game is saved automatically, so you can pick up right where you left off.'); }
      };

      function rank() {
        return S.score >= 100 ? 'Rank: Master Detective!' : S.score >= 75 ? 'Rank: Sharp-Eyed Sleuth.' : S.score >= 50 ? 'Rank: Junior Detective.' : S.score >= 25 ? 'Rank: Curious Visitor.' : 'Rank: Nervous Newcomer.';
      }
      function slotList() {
        return [1, 2, 3].map(n => { const s = api.load('slot' + n, null); return `  ${n}. ${s ? `${R[s.room].n}, ${s.score} points, ${s.moves} moves` : '(empty)'}`; }).join('\n');
      }
      function saveSlot(n) { api.save('slot' + n, JSON.parse(JSON.stringify(S))); api.sfx.floppy ? api.sfx.floppy() : api.sfx.click(); print(`Game saved in slot ${n}.`, 'mmr-sys'); }
      function loadSlot(n) {
        const s = api.load('slot' + n, null);
        if (!s) { print(`Slot ${n} is empty.`, 'mmr-sys'); return; }
        S = s; print(`Game loaded from slot ${n}.`, 'mmr-sys'); describe(true);
      }
      function win() {
        api.sfx.tada();
        print('Aunt Mabel gasps. "Mother\'s locket! Wherever did you find it?"\n\nYou tell her the whole story: the missing cookies, the stolen spoons, the tiny muddy handprints, the glowing eyes in the attic... and the lonely raccoon who only wanted a warm, dry home and a friend.\n\nAunt Mabel laughs so hard she has to sit down on the porch swing. (It squeaks.) "A raccoon! And to think I almost called a ghost hunter!"\n\nThat evening the two of you carry a plate of apple slices out to the treehouse. A small masked face peeks out of the patchwork blanket, chirrs a thank-you, and settles back down to sleep.\n\nThe Mystery of Maple Manor is solved.', 'mmr-big');
        print('*** THE END ***', 'mmr-big');
        print(`You scored ${S.score} out of ${MAX} points in ${S.moves} moves. ${rank()}\nType RESTART to play again.`);
        api.earn(6, 'solving the Mystery of Maple Manor');
      }
      function newGame(quiet) {
        S = fresh(); pending = null;
        if (!quiet) outEl.textContent = '';
        print('MYSTERY OF MAPLE MANOR', 'mmr-big');
        print('An Interactive Mystery. Copyright (c) 1985 Lanternlight Software.\nType HELP for instructions, HINT if you get stuck, MAP to see where you\'ve been.', 'mmr-sys');
        print('Aunt Mabel invited you to stay at Maple Manor, her creaky old house at the edge of town. The whole neighborhood says it\'s HAUNTED: thumps in the night, missing cookies and glowing eyes in the attic window. When the bus drops you off, nobody is home...');
        enter('gate');
        autosave(); status();
      }
      function autosave() { api.save('auto', S); }

      /* ---------- input ---------- */
      function submit(cmd) {
        api.sfx.key();
        run(cmd);
        if (S) { autosave(); status(); }
        scrollDown();
      }
      root.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const v = input.value; input.value = '';
        if (v.trim()) { hist.push(v); hi = hist.length; }
        submit(v);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi] || ''; }
        else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
      });
      root.querySelector('.mmr-pad').addEventListener('click', e => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        submit(b.dataset.c);
        if (!matchMedia('(pointer: coarse)').matches) input.focus();
      });
      W.onKey = e => {
        if (e.target === input || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key.length === 1 && !e.target.closest('button,.menu')) { input.focus(); }
      };
      outEl.addEventListener('pointerup', () => { if (!getSelection().toString() && !matchMedia('(pointer: coarse)').matches) input.focus(); });

      api.menubar([
        { label: 'Game', items: [
          { label: 'New game', fn: () => submit('restart') },
          { label: 'Save...', fn: () => submit('save') },
          { label: 'Load...', fn: () => submit('load') },
          '-',
          { label: 'Map', fn: () => submit('map') },
          { label: 'Hint', fn: () => submit('hint') },
          { label: 'Score', fn: () => submit('score') },
          '-',
          { label: 'How to play', fn: () => submit('help') }
        ] },
        ...(dos ? [] : [{ label: 'Options', items: () => [{ label: (showArt ? 'Hide' : 'Show') + ' pictures', fn: () => { showArt = !showArt; api.save('art', showArt); status(); } }] }])
      ]);

      W.onClose = () => { if (S) autosave(); };

      const saved = api.load('auto', null);
      if (saved && saved.room && R[saved.room] && !saved.won) {
        S = saved;
        // Objects added in later versions start where they belong.
        Object.keys(O).forEach(k => { if (!(k in S.at)) S.at[k] = O[k].at; });
        print('MYSTERY OF MAPLE MANOR', 'mmr-big');
        print('Welcome back! Your game was saved automatically. (Type RESTART for a new game.)', 'mmr-sys');
        describe(true); status();
      } else newGame(true);
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    }
  });
})();
