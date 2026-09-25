/* Klondike Trail: a store game (1990).
   An original trail-journey game set on the real route of the Klondike Gold Rush, 1897-98:
   Seattle by steamer to Skagway or Dyea, over the Chilkoot or White Pass, build a boat at Lake Bennett,
   then down the lakes and the Yukon River to Dawson City before freeze-up.
   Family friendly: worn-out stampeders turn back and head home to recover. The people you meet are made up. */
(function () {
  'use strict';

  const DEV = /[?&]dev\b/.test(location.search);
  const DAYMS = 86400000;
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON3 = MON.map(m => m.slice(0, 3));

  /* ---------- palette (EGA 16 plus a few VGA tones) and a 5x7 pixel font ---------- */
  const PAL = {
    k: '#000000', b: '#0000aa', g: '#00aa00', c: '#00aaaa', r: '#aa0000', m: '#aa00aa', n: '#aa5500', l: '#aaaaaa',
    d: '#555555', B: '#5555ff', G: '#55ff55', C: '#55ffff', R: '#ff5555', M: '#ff55ff', y: '#ffff55', w: '#ffffff',
    f: '#e8b080', t: '#c89858', N: '#5a3010', s: '#c8d8f0', D: '#005500', o: '#ff9933', a: '#8898b0', A: '#3c4860', e: '#e8dcb0'
  };
  const FONT = {
    A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1e11111111111e', E: '1f10101e10101f', F: '1f10101e101010',
    G: '0e11101711110f', H: '1111111f111111', I: '0e04040404040e', J: '0702020202120c', K: '11121418141211', L: '1010101010101f',
    M: '111b1515111111', N: '11111915131111', O: '0e11111111110e', P: '1e11111e101010', Q: '0e11111115120d', R: '1e11111e141211',
    S: '0f10100e01011e', T: '1f040404040404', U: '1111111111110e', V: '11111111110a04', W: '1111111515150a', X: '11110a040a1111',
    Y: '1111110a040404', Z: '1f01020408101f', 0: '0e11131519110e', 1: '040c040404040e', 2: '0e11010204081f', 3: '1f02040201110e',
    4: '02060a121f0202', 5: '1f101e0101110e', 6: '0608101e11110e', 7: '1f010204080808', 8: '0e11110e11110e', 9: '0e11110f01020c',
    '.': '00000000000c0c', ',': '000000000c0408', '!': '04040404040004', '?': '0e110102040004', ':': '000c0c000c0c00',
    '-': '0000001f000000', "'": '04040800000000', '/': '01010204081010', '$': '040f140e051e04', '(': '02040808080402', ')': '08040202020408',
    '&': '0c12140815120d', '+': '0004041f040400', '%': '18190204081303', '"': '0a0a0000000000', '=': '00001f001f0000', '>': '08040201020408'
  };

  /* ---------- the outfit ---------- */
  // per = how much one store unit adds, lb = weight of one store unit
  const GOODS = [
    { k: 'flour', name: 'Flour', unit: '50-lb sack', per: 50, lb: 50, price: 1.5, food: 1, max: 99 },
    { k: 'bacon', name: 'Bacon', unit: '25-lb side', per: 25, lb: 25, price: 3, food: 1, max: 99 },
    { k: 'beans', name: 'Beans', unit: '25-lb sack', per: 25, lb: 25, price: 1, food: 1, max: 99 },
    { k: 'fruit', name: 'Dried fruit', unit: '25-lb box', per: 25, lb: 25, price: 2.5, food: 1, max: 99 },
    { k: 'coffee', name: 'Coffee and tea', unit: '10-lb tin', per: 10, lb: 10, price: 3, food: 1, max: 60 },
    { k: 'sugar', name: 'Sugar', unit: '25-lb sack', per: 25, lb: 25, price: 1.5, food: 1, max: 99 },
    { k: 'clothes', name: 'Warm clothing', unit: 'outfit', per: 1, lb: 20, price: 15, max: 10, note: 'Mackinaw coat, wool shirts, mitts and boots' },
    { k: 'blankets', name: 'Wool blankets', unit: 'pair', per: 1, lb: 10, price: 6, max: 10 },
    { k: 'tents', name: 'Canvas tent', unit: 'tent', per: 1, lb: 40, price: 12, max: 4 },
    { k: 'tools', name: "Carpenter's tools", unit: 'set', per: 1, lb: 60, price: 18, max: 3, note: 'Whipsaw, axe, plane, hammer, chisels' },
    { k: 'rope', name: 'Rope', unit: '100-ft coil', per: 1, lb: 10, price: 3, max: 8 },
    { k: 'nails', name: 'Nails and pitch', unit: 'keg', per: 1, lb: 30, price: 5, max: 8, note: 'For building and patching a boat' },
    { k: 'rifle', name: 'Rifle', unit: 'rifle', per: 1, lb: 10, price: 15, max: 2 },
    { k: 'ammo', name: 'Cartridges', unit: 'box of 20', per: 20, lb: 3, price: 1.5, max: 20 },
    { k: 'fishing', name: 'Fishing gear', unit: 'kit', per: 1, lb: 5, price: 3, max: 3 },
    { k: 'medicine', name: 'Medicine chest', unit: 'chest (6 uses)', per: 6, lb: 15, price: 10, max: 4 },
    { k: 'candles', name: 'Candles', unit: 'box of 40', per: 40, lb: 10, price: 2, max: 10 },
    { k: 'sled', name: 'Hand sled', unit: 'sled', per: 1, lb: 40, price: 12, max: 5, note: 'Lets one person haul twice as much over snow' },
    { k: 'horses', name: 'Pack horse', unit: 'horse', per: 1, lb: 0, price: 40, max: 3, note: 'Carries 150 lb. Cannot climb the last pitch of the Chilkoot' }
  ];
  const GOOD = Object.fromEntries(GOODS.map(g => [g.k, g]));
  const FOODS = ['flour', 'bacon', 'beans', 'fruit', 'coffee', 'sugar'];
  const FOOD_SHARE = { flour: 0.45, bacon: 0.2, beans: 0.15, fruit: 0.08, sugar: 0.09, coffee: 0.03 };
  const BORDER_LB = 1000;   // pounds of food per person the Mounties want to see at the summit

  const BGS = [
    { name: 'Seattle shopkeeper', money: 1500, mult: 1, desc: 'You sold your dry-goods store to go north. The most money, but the fewest points.' },
    { name: 'Schoolteacher', money: 1100, mult: 1.5, desc: 'Your cheerful lessons by the campfire help the party recover faster when resting.' },
    { name: 'Carpenter', money: 950, mult: 2, desc: 'You build your boat in half the time, and a sturdier one too.' },
    { name: 'Farmer', money: 800, mult: 2.5, desc: 'You are used to hard work in all weather, so the party wears down more slowly. The least money, the most points.' }
  ];
  const DEPART = [
    { y: 1897, m: 7, price: 1.0, desc: 'No snow yet, but the trails are muddy, and you must race the Yukon freeze-up in October.' },
    { y: 1897, m: 8, price: 1.05, desc: 'Autumn rains and mud. You will probably be frozen in for the winter somewhere along the way.' },
    { y: 1897, m: 9, price: 1.1, desc: 'The first snows. Expect a long winter camp before the ice goes out in spring.' },
    { y: 1897, m: 10, price: 1.1, desc: 'Deep cold. Sleds make hauling over snow easier, but watch for frostbite.' },
    { y: 1897, m: 11, price: 1.15, desc: 'The darkest, coldest month. Hard-packed snow, short days, a long wait at Lake Bennett.' },
    { y: 1898, m: 0, price: 1.15, desc: 'Bitter cold and crowded trails, but good sledding.' },
    { y: 1898, m: 1, price: 1.2, desc: 'The big crowds arrive. Snowstorms, and avalanche danger on the pass.' },
    { y: 1898, m: 2, price: 1.25, desc: 'The busiest month and the highest prices. Avalanche season, but only a short wait for the ice to go out.' }
  ];
  const PACES = [
    { name: 'Steady', walk: 10, loads: 2, row: 1, drain: 0, ill: 0 },
    { name: 'Strenuous', walk: 13, loads: 3, row: 1.2, drain: 0.9, ill: 0.004 },
    { name: 'Grueling', walk: 16, loads: 4, row: 1.4, drain: 2.3, ill: 0.012 }
  ];
  const RATIONS = [
    { name: 'Full', lb: 3, hp: 0.5, ill: 0 },
    { name: 'Meager', lb: 2, hp: -0.8, ill: 0.006 },
    { name: 'Bare bones', lb: 1.25, hp: -2.2, ill: 0.016 }
  ];

  /* ---------- places ---------- */
  const LMS = {
    seattle: { name: 'Seattle', full: 'Seattle, Washington', scene: 'seattle', map: [297, 146],
      note: 'In July 1897 the steamship <i>Portland</i> docked in Seattle carrying miners from the Klondike and a fortune in gold. Within days, thousands of people were buying outfits and steamer tickets north. Seattle stores sold food, clothing and gear to the stampeders, and the city boomed.' },
    skagway: { name: 'Skagway', full: 'Skagway, Alaska', scene: 'skagway', map: [207, 94], store: 1.4, trade: 1, packers: { rate: 5, to: 'wpsummit', who: 'freighters with pack trains', only: 'white' },
      note: 'Skagway sits at the head of the Taiya Inlet. In 1897 it grew almost overnight from a lonely homestead into a crowded boomtown of tents, stores and saloons. It was the start of the White Pass trail, and it had a rough reputation: con men and thieves preyed on newcomers.' },
    dyea: { name: 'Dyea', full: 'Dyea, Alaska', scene: 'dyea', map: [201, 89], store: 1.5, trade: 1, packers: { rate: 6, to: 'scales', who: 'Tlingit packers' },
      note: 'Dyea, a few miles from Skagway, was the start of the Chilkoot Trail. The Tlingit people had used this route over the mountains for trade long before the gold rush. Dyea\'s shallow tidal flats kept steamers away from shore, so goods were often landed by small boat and piled on the beach.' },
    canyon: { name: 'Canyon City', scene: 'camp', map: [199, 86], hunt: 1,
      note: 'Canyon City was a tent town where the Chilkoot Trail entered a narrow canyon. Stampeders rested here and moved their goods forward in stages before the steep climb ahead.' },
    sheep: { name: 'Sheep Camp', scene: 'camp', map: [197, 83], store: 1.8, trade: 1, hunt: 1,
      note: 'Sheep Camp was the last big camp below the Chilkoot Pass. It was named for hunters who once camped here to hunt mountain sheep. In early 1898 thousands of people crowded its tents and cook houses. Avalanches were a real danger on the slopes above.' },
    scales: { name: 'The Scales', scene: 'scales', map: [196, 81], packers: { rate: 9, to: 'chsummit', who: 'Tlingit packers', stairs: 1 },
      note: 'At The Scales, packers weighed loads again before the last and steepest climb, and charged more to carry them. Many stampeders cached (stored) their goods here and carried them up the pass one load at a time.' },
    chsummit: { name: 'Chilkoot Pass', full: 'The Chilkoot Pass summit', scene: 'summit', map: [195, 78], border: 1,
      note: 'The Chilkoot Pass is about 3,500 feet (1,070 m) high. The border here was disputed at the time, and in early 1898 the North-West Mounted Police set up a post at the summit. They turned back anyone who did not bring about a year\'s supply of food, and they collected customs duty on goods bought outside Canada.' },
    lindeman: { name: 'Lake Lindeman', scene: 'lake', map: [193, 74], fish: 1, hunt: 1,
      note: 'Lake Lindeman was the first lake on the far side of the Chilkoot. Some stampeders built their boats here. Many others hauled their goods a few more miles to Lake Bennett, to avoid the rough stretch of river between the two lakes.' },
    wpcity: { name: 'White Pass City', scene: 'camp', map: [207, 86], store: 1.6, trade: 1, hunt: 1,
      note: 'White Pass City was a tent town that sprang up along the White Pass trail in 1897, selling meals and supplies to travelers on their way up to the pass.' },
    wpsummit: { name: 'White Pass', full: 'The White Pass summit', scene: 'summit', map: [205, 80], border: 1,
      note: 'The White Pass is lower than the Chilkoot, about 2,900 feet (880 m), and pack horses could use it. But the trail was longer, and in the rainy fall of 1897 heavy traffic turned it into deep mud. In early 1898 the Mounties set up a border post at this summit too.' },
    logcabin: { name: 'Log Cabin', scene: 'camp', map: [199, 75], hunt: 1,
      note: 'Log Cabin was a camp on the Canadian side of the White Pass, where the trail began its way down toward Lake Bennett.' },
    bennett: { name: 'Lake Bennett', scene: 'bennett', map: [191, 70], store: 2.2, trade: 1, fish: 1, hunt: 1,
      note: 'In the winter of 1897-98, thousands of stampeders camped around Lake Bennett. They cut down trees and sawed them into planks by hand to build boats. When the ice broke up at the end of May 1898, more than 7,000 boats set off down the lakes toward Dawson City.' },
    tagish: { name: 'Tagish Post', scene: 'lake', map: [193, 63], fish: 1, hunt: 1,
      note: 'At Tagish Post the Mounties painted a number on each boat and wrote down the names of everyone aboard, so they could keep track of travelers on the river.' },
    marsh: { name: 'Marsh Lake', scene: 'lake', map: [190, 56], fish: 1, hunt: 1,
      note: 'Marsh Lake is a wide, shallow lake on the way to the Yukon River. On calm days the boats drifted. When the wind came up, travelers rigged sails from blankets or tent canvas.' },
    miles: { name: 'Miles Canyon', scene: 'canyon', map: [186, 49], rapids: 'miles',
      note: 'Miles Canyon is a narrow gorge with steep walls of dark basalt rock. The fast water inside wrecked many boats in 1898. After the wrecks, Superintendent Sam Steele of the Mounties ruled that boats had to be steered through by experienced pilots.' },
    whitehorse: { name: 'White Horse Rapids', scene: 'whitehorse', map: [185, 45], rapids: 'whitehorse',
      note: 'Below Miles Canyon, the White Horse Rapids churned into foaming waves that reminded people of the manes of white horses. The city of Whitehorse later grew up here.' },
    laberge: { name: 'Lake Laberge', scene: 'laberge', map: [180, 38], fish: 1, hunt: 1,
      note: 'Lake Laberge is about 50 km (30 miles) long. Strong winds can raise big waves, and in spring its ice often lasts longer than the river\'s. The poet Robert Service later made the lake famous in a poem.' },
    fivefinger: { name: 'Five Finger Rapids', scene: 'fivefinger', map: [140, 31], rapids: 'five',
      note: 'At Five Finger Rapids, four rock islands split the Yukon River into five channels. The right-hand channel is the safest way through.' },
    selkirk: { name: 'Fort Selkirk', scene: 'selkirk', map: [112, 27], store: 2.5, trade: 1, fish: 1, hunt: 1,
      note: 'Fort Selkirk stands where the Pelly River joins the Yukon. It has long been a gathering place for the Northern Tutchone people, and the Hudson\'s Bay Company built a trading post here in 1848.' },
    dawson: { name: 'Dawson City', scene: 'dawson', map: [40, 18],
      note: 'Dawson City grew up where the Klondike River flows into the Yukon. Gold was found on nearby Bonanza Creek in August 1896 by George Carmack, Skookum Jim and Dawson Charlie. By the summer of 1898 Dawson was a busy town of tens of thousands of people, but most stampeders arrived to find that the richest creeks had already been claimed.' }
  };
  const TRAILS = {
    chilkoot: [['dyea', 1004], ['canyon', 1012], ['sheep', 1017], ['scales', 1020], ['chsummit', 1021], ['lindeman', 1030], ['bennett', 1037]],
    white: [['wpcity', 1010], ['wpsummit', 1020], ['logcabin', 1031], ['bennett', 1042]]
  };
  const RIVER = [['tagish', 45], ['marsh', 60], ['miles', 95], ['whitehorse', 98], ['laberge', 125], ['fivefinger', 310], ['selkirk', 365], ['dawson', 555]];
  const LAKES = [[0, 26], [29, 42], [60, 80], [125, 156]];   // miles below Lake Bennett that are lake, not river
  const SEA_PATH = [[297, 146], [284, 135], [262, 122], [236, 108], [207, 94]];

  const TALK = {
    seattle: [['clerk', 'The clerk leans on the counter: "The Mounties at the border count your food. A thousand pounds a head, or back down the mountain you go. You\'ll eat as you travel, so buy more than that."'],
      ['sailor', 'A sailor on the dock says: "Every berth north is sold out a week ahead. They\'re packing folks in like sardines, and horses in the hold."'],
      ['lady', 'A woman with a carpetbag says: "My brother went north in July. His letter says: bring nails, bring rope, and bring twice the socks you think you need."']],
    skagway: [['agent', 'A freight agent says: "Chilkoot\'s shorter, but horses can\'t take the last climb. The White Pass lets you keep your horses, if you don\'t mind mud up to their knees."'],
      ['old', 'An old prospector says: "Hold on to your wallet in Skagway, friend. There are more card sharps here than nuggets in the Klondike."'],
      ['kid', 'A newsboy shouts: "Extra! Another steamer in from Seattle, packed to the rails! Read all about it!"']],
    dyea: [['packer', 'A Tlingit packer checks the straps on a heavy load. "We charge by the pound," he says. "At The Scales the price goes up. The last climb is the hardest work on the whole trail."'],
      ['lady', 'A woman running a tent bakery says: "Fresh bread, ten cents! Eat well now, dear. There\'s no bakery at the top of the pass."'],
      ['old', 'A stampeder sitting on his sacks says: "Move your goods in short hops. Carry a load ahead, stash it, walk back for the next. That\'s the only way to move a ton."']],
    canyon: [['old', 'A tired man rubs his shoulders: "Forty trips from Dyea so far. My pack straps have worn grooves in my coat."'],
      ['lady', 'A cook stirring a kettle of beans says: "Keep your feet dry and your spirits up. Wet socks have turned back more folks than bears."']],
    sheep: [['cook', 'A roadhouse cook says: "Keep an eye on the sky. When heavy snow piles up on those slopes, stay in camp."'],
      ['old', 'A stampeder says: "The Mounties at the summit will count your food. Folks without enough get sent right back down here."']],
    scales: [['packer', 'A packer tells you: "From here it is straight up. Many trips for a whole outfit. We can carry some of it, for a price."'],
      ['kid', 'A young stampeder laughs: "Up the stairs with a load, then down the slide on the seat of your pants! Best ride in Alaska."']],
    chsummit: [['mountie', 'A Mountie in a red coat says: "Welcome to Canada. Keep your boat papers and your temper, and you\'ll do fine."'],
      ['old', 'A man leaning on a stack of flour sacks says: "I\'ve climbed those stairs thirty times. My legs have forgotten how to walk on flat ground."']],
    lindeman: [['builder', 'A boatbuilder says: "Some build here, but the river down to Bennett is rough. Most folks haul their goods the last few miles."']],
    wpcity: [['agent', 'A packer with a string of horses says: "Mud to the knees in the fall, deep snow in the winter. The White Pass has no easy season."']],
    wpsummit: [['mountie', 'A Mountie says: "Your outfit looks sound. Mind the weather on the way down to the lakes."']],
    logcabin: [['old', 'A trapper says: "Lake Bennett is a day or two down the trail. You\'ll smell the sawdust before you see it."']],
    bennett: [['builder', 'A sawyer says: "Whipsawing is hard work. One of you stands on top of the log and one underneath. Try to stay friends!"'],
      ['lady', 'A woman selling pies says: "When the ice goes, it goes all at once. Be ready, or the whole town will leave without you."'],
      ['carp', 'A carpenter says: "Plenty of nails and pitch, or your boat will leak like a basket."']],
    tagish: [['mountie', 'A Mountie paints a number on your bow. "If anyone goes missing on the river, we\'ll know where to look," he says.']],
    marsh: [['old', 'A man fishing from the shore says: "Calm today. But on these lakes the wind comes up fast. Pull ashore when the waves get big."']],
    miles: [['pilot', 'A river pilot says: "I\'ve taken a hundred boats through. Stay in the middle, keep off the walls, and mind the whirlpool."']],
    whitehorse: [['pilot', 'A pilot points at the rapids: "See the foam? Looks like a herd of white horses. That\'s how she got her name."']],
    laberge: [['old', 'A stampeder says: "Long and cold, this lake. Its ice hangs on longer in the spring than the river\'s."']],
    fivefinger: [['old', 'An old-timer on the bank calls: "Take the right-hand channel! The others will spin you like a top!"']],
    selkirk: [['trader', 'The trader says: "Dawson is still a long way downriver. Buy what you need here. Prices only go up from here on."']]
  };

  const HOF_DEFAULT = [['Hattie Birch', 21400], ['Big Ole Svensen', 16800], ['Ma Delaney', 13300], ['Flapjack Pete', 10600], ['Tillie Rowe', 8400],
    ['Riverboat Rosie', 6500], ['Lucky Lou', 4800], ['Two-Pan Tom', 3300], ['Frying Pan Fred', 2000], ['Greenhorn Gus', 900]].map(([name, score]) => ({ name, score }));
  const rankOf = s => s >= 20000 ? 'Bonanza Legend' : s >= 13000 ? 'Sourdough' : s >= 8000 ? 'Seasoned Stampeder' : s >= 4000 ? 'Stampeder' : 'Cheechako';
  const NAMES = ['Ada', 'Amos', 'Belle', 'Clem', 'Cora', 'Eli', 'Etta', 'Frank', 'Hattie', 'Hiram', 'Ida', 'Jonas', 'Kate', 'Lars', 'Lottie', 'Mabel',
    'Nell', 'Otis', 'Pearl', 'Rufus', 'Sadie', 'Silas', 'Tess', 'Walt', 'Winnie', 'Zeke', 'Minnie', 'Gus', 'Ruth', 'Ned'];

  const SONGS = {
    title: { mel: [67, 0, 67, 71, 74, 0, 74, 0, 72, 71, 69, 0, 71, 0, 67, 0, 69, 0, 69, 71, 72, 0, 76, 0, 74, 72, 71, 69, 67, 0, 0, 0], bass: [43, 50, 48, 43, 45, 48, 50, 43], step: 0.19, lead: 'square', leadVol: 0.028, bassVol: 0.06 },
    trail: { mel: [62, 0, 66, 0, 69, 0, 66, 0, 67, 0, 71, 0, 69, 0, 0, 0, 66, 0, 69, 0, 74, 0, 71, 0, 69, 67, 66, 64, 62, 0, 0, 0], bass: [50, 50, 55, 50, 50, 55, 45, 50], step: 0.24, lead: 'triangle', leadVol: 0.045, bassVol: 0.05 },
    river: { mel: [64, 0, 67, 71, 0, 67, 64, 0, 66, 0, 69, 72, 0, 69, 66, 0, 67, 0, 71, 74, 0, 71, 67, 0, 69, 67, 66, 64, 0, 0, 0, 0], bass: [40, 45, 47, 40, 43, 45, 47, 40], step: 0.2, lead: 'triangle', leadVol: 0.045, bassVol: 0.05 },
    rapids: { mel: [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 71, 72, 74, 0, 72, 74, 76, 74, 72, 71, 69, 71, 72, 71, 69, 68, 69, 0, 69, 0], bass: [45, 45, 48, 52, 50, 45, 52, 45], step: 0.13, lead: 'square', leadVol: 0.025, bassVol: 0.06 },
    winter: { mel: [64, 0, 67, 0, 71, 0, 69, 67, 64, 0, 62, 0, 64, 0, 0, 0, 60, 0, 64, 0, 67, 0, 66, 64, 62, 0, 64, 0, 0, 0, 0, 0], bass: [40, 45, 43, 40, 36, 43, 38, 40], step: 0.32, lead: 'triangle', leadVol: 0.04, bassVol: 0.05 },
    dawson: { mel: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 71, 0, 74, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 81, 79, 77, 76, 0, 72, 0], bass: [48, 55, 50, 55, 48, 55, 43, 48], step: 0.15, lead: 'square', leadVol: 0.028, bassVol: 0.06 }
  };

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#0000aa"/><rect x="0" y="0" width="32" height="6" fill="#000"/><rect x="3" y="2" width="1" height="1" fill="#fff"/><rect x="26" y="3" width="1" height="1" fill="#fff"/><path d="M0 24 L10 8 L15 14 L20 6 L32 22 L32 32 L0 32Z" fill="#fff"/><path d="M20 6 L32 22 L32 32 L22 32 L24 20Z" fill="#aaa"/><path d="M10 8 L13 12 L9 14 L6 14Z" fill="#c8d8f0"/><g fill="#000"><rect x="8" y="17" width="2" height="3"/><rect x="11" y="15" width="2" height="3"/><rect x="14" y="13" width="2" height="3"/><rect x="17" y="11" width="2" height="3"/></g><g fill="#aa5500"><rect x="7" y="17" width="1" height="2"/><rect x="10" y="15" width="1" height="2"/><rect x="13" y="13" width="1" height="2"/><rect x="16" y="11" width="1" height="2"/></g><rect x="0" y="26" width="32" height="6" fill="#aa5500"/><ellipse cx="16" cy="28" rx="9" ry="3" fill="#555"/><ellipse cx="16" cy="28" rx="6" ry="2" fill="#333"/><rect x="13" y="27" width="2" height="1" fill="#ff5"/><rect x="17" y="28" width="1" height="1" fill="#ff5"/><rect x="19" y="27" width="1" height="1" fill="#ff5"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'klondike',
    label: 'Klondike Trail',
    kind: 'store',
    cat: 'game',
    year: 1990,
    price: 24.95,
    publisher: 'Northern Lights Educational Software',
    genre: 'Adventure / History',
    help: 'Lead a party of stampeders from Seattle over the mountains and down the Yukon River to the Klondike gold fields. Reach Dawson City to earn money.',
    tagline: 'Seattle to Dawson City, 1897. Pack a ton of grub.',
    blurb: 'It is 1897 and gold has been found in the Klondike! Outfit your party in Seattle, sail north to Skagway, haul a ton of goods up the Golden Stairs of the Chilkoot Pass, get past the Mounties at the border, build a boat at Lake Bennett and run the rapids of Miles Canyon. Can you reach Dawson City before the Yukon freezes? Real history, real choices, and a different journey every time.',
    sizeKB: 1380,
    box: { bg: '#1a2a5a', fg: '#ffffff', accent: '#ffcc33' },
    icon: ICON,
    window: { w: 720, h: 600 },
    css: `
      .kdk{position:absolute;inset:0;display:flex;flex-direction:column;background:#3a2410;color:#2a1600;font:17px/1.25 var(--dos);user-select:none;-webkit-user-select:none;overflow:hidden}
      .kdk-top{flex:none;display:flex;gap:6px;padding:6px 6px 0;justify-content:center;align-items:stretch;min-height:0}
      .kdk-frame{flex:none;border:3px solid;border-color:#e0b068 #6a4010 #6a4010 #e0b068;background:#000;line-height:0;align-self:flex-start}
      .kdk-frame canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
      .kdk-side{flex:1 1 180px;min-width:0;max-width:240px;background:#000;color:#fff;border:3px solid;border-color:#e0b068 #6a4010 #6a4010 #e0b068;padding:4px 7px;font-size:15px;line-height:1.22;overflow:hidden}
      .kdk-side:empty{display:none}
      .kdk-side div{display:flex;justify-content:space-between;gap:6px;white-space:nowrap}
      .kdk-side div span{color:#55ffff;flex:none}
      .kdk-side div b{font-weight:400;overflow:hidden;text-overflow:ellipsis;text-align:right}
      .kdk-side .kdk-sh{color:#ffff55;justify-content:center;border-bottom:1px solid #aa5500;margin-bottom:2px}
      .kdk-nar .kdk-top{flex-direction:column;align-items:center}.kdk-nar .kdk-frame{align-self:center}
      .kdk-nar .kdk-side{max-width:none;width:100%;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;column-gap:10px;font-size:13px;padding:2px 6px;flex:none}
      .kdk-nar .kdk-side .kdk-sh{grid-column:1/-1}
      .kdk-big .kdk-side{display:none}
      .kdk-nar .kdk-side:empty,.kdk .kdk-side:empty{display:none}
      .kdk-txt{flex:1;min-height:0;overflow:auto;margin:6px;padding:6px 10px 10px;background:#f0e0b0;border:3px solid;border-color:#fff4d0 #8a5a20 #8a5a20 #fff4d0;box-shadow:inset 0 0 0 1px #c8a060;-webkit-overflow-scrolling:touch}
      .kdk-h{color:#aa0000;margin:0 0 4px;font-size:1.15em}
      .kdk-p p{margin:0 0 7px}
      .kdk-p p:last-child{margin-bottom:4px}
      .kdk-r{color:#aa0000}.kdk-g{color:#006a00}.kdk-b{color:#0000aa}.kdk-dim{color:#806440}
      .kdk-ch{display:block;width:100%;text-align:left;background:none;border:0;color:#2a1600;font:inherit;padding:3px 6px;margin:0;cursor:pointer;border-radius:0;min-height:30px;box-sizing:border-box}
      .kdk-ch b{color:#aa0000;font-weight:700}
      .kdk-ch:hover,.kdk-ch:focus-visible{background:#aa5500;color:#fff;outline:none}
      .kdk-ch:hover b,.kdk-ch:focus-visible b{color:#ffff55}
      .kdk-ch:disabled{color:#a89070;cursor:default;background:none}
      .kdk-ch:disabled b{color:#a89070}
      .kdk-cont{margin-top:6px;color:#0000aa;animation:kdk-blink 1.1s steps(2) infinite}
      @keyframes kdk-blink{50%{color:#5555ff}}
      .kdk-in{display:grid;grid-template-columns:auto 1fr;gap:5px 8px;align-items:center;margin:4px 0 8px;max-width:420px}
      .kdk-in input{font:inherit;background:#fffbe8;color:#0000aa;border:2px solid;border-color:#8a5a20 #fff4d0 #fff4d0 #8a5a20;padding:1px 6px;min-width:0;width:100%;box-sizing:border-box;border-radius:0}
      .kdk-in input:focus{outline:2px solid #aa5500}
      .kdk-tb{width:100%;border-collapse:collapse;margin:2px 0 6px}
      .kdk-tb td{padding:1px 4px;vertical-align:top}
      .kdk-tb td.kdk-n{text-align:right;white-space:nowrap}
      .kdk-tb tr:nth-child(even) td{background:#e6d29c}
      .kdk-tb tr.kdk-me td{background:#aa5500;color:#fff}
      .kdk-shop{margin:0 0 4px}
      .kdk-row{display:grid;grid-template-columns:1fr auto auto auto 68px;gap:4px;align-items:center;padding:2px 3px;border-bottom:1px dotted #c8a060}
      .kdk-row.kdk-sel{background:#e0c888}
      .kdk-row small{display:block;color:#806440;font-size:.8em;line-height:1.1}
      .kdk-row .btn{min-width:0;width:30px;height:28px;padding:0;font:700 16px var(--ui);color:#000;line-height:1}
      .kdk-row input{width:42px;font:inherit;text-align:right;background:#fffbe8;color:#0000aa;border:2px solid;border-color:#8a5a20 #fff4d0 #fff4d0 #8a5a20;padding:0 3px;box-sizing:border-box;border-radius:0}
      .kdk-row .kdk-c{text-align:right;color:#006a00}
      .kdk-cat{color:#aa0000;margin:6px 0 1px;border-bottom:2px solid #aa5500}
      .kdk-tot{position:sticky;bottom:-10px;background:#e6d29c;border:2px solid #aa5500;padding:3px 6px;margin-top:6px;display:flex;flex-wrap:wrap;gap:0 14px}
      .kdk-bar{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .kdk-bar .btn{font:14px var(--ui);color:#000;min-height:34px;padding:0 12px}
      .kdk-ctl{display:flex;gap:6px;margin-top:6px}
      .kdk-ctl .btn{flex:1;min-height:48px;font:700 15px var(--ui);color:#000;touch-action:none}
      .kdk-meter{display:inline-block;width:90px;height:10px;border:1px solid #2a1600;background:#fffbe8;vertical-align:middle}
      .kdk-meter i{display:block;height:100%;background:#006a00}
      .kdk-nar .kdk-row{grid-template-columns:1fr auto auto auto;font-size:15px}
      .kdk-nar .kdk-row .kdk-c{display:none}
      .kdk-nar .kdk-txt{margin:4px;padding:4px 7px 8px;font-size:16px}
    `,
    open(W, api) {
      const esc = api.esc;
      let S = api.load('game', null);
      if (S && (S.v !== 1 || !Array.isArray(S.party))) S = null;
      const opt = Object.assign({ sound: true, music: true, speed: 1 }, api.load('opt', {}));
      let hof = api.load('hof', null);
      if (!Array.isArray(hof) || !hof.length) hof = HOF_DEFAULT.slice();
      const dev = { fast: false };
      let LW = 320, LH = 160, big = false, small = false;
      let cur = { name: 'title', opt: {} };
      let curChoices = [], curCont = null, anyKey = null, extraKey = null;
      let raf = 0, tickT = 0, dead = false, G = null, curSong = null, running = false;
      let lastEnd = null;

      W.body.innerHTML = '<div class="kdk"><div class="kdk-top"><div class="kdk-frame"><canvas width="320" height="160"></canvas></div><div class="kdk-side" aria-live="off"></div></div><div class="kdk-txt" aria-live="polite"></div></div>';
      const root = W.body.firstChild, cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
      const txtEl = root.querySelector('.kdk-txt'), sideEl = root.querySelector('.kdk-side');
      const vga = api.era.id !== '1990';   // later computers show a few extra shades

      /* ---------- helpers ---------- */
      const rnd = (a, b) => a + Math.random() * (b - a);
      const irnd = (a, b) => Math.floor(rnd(a, b + 1));
      const chance = p => Math.random() < p;
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const money = v => '$' + (Math.round(v * 100) / 100).toFixed(2);
      const lbs = v => Math.round(v).toLocaleString('en-US') + ' lb';
      const plural = (n, w, p) => n + ' ' + (n === 1 ? w : (p || w + 's'));
      const here = () => S ? S.party.filter(m => !m.gone) : [];
      const nm = m => '<span class="kdk-b">' + esc(m.name) + '</span>';
      const ms = v => dev.fast ? Math.min(v, 12) : v;
      const save = () => { if (S) api.save('game', S); };
      const saveOpt = () => api.save('opt', opt);
      const dateOf = day => new Date(Date.UTC(S.y0, S.m0, 1) + day * DAYMS);
      const today = () => dateOf(S.day);
      const fmtDate = d => MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
      const fmtShort = d => MON3[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
      const doy = d => Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAYMS);
      const monthNow = () => today().getUTCMonth();
      function frozen(d = today(), extra = 0) { const x = doy(d); return x >= S.freezeDoy + extra || x < S.breakDoy; }
      const hpWord = h => h >= 70 ? 'Good' : h >= 45 ? 'Fair' : h >= 20 ? 'Poor' : 'Very poor';
      const hpCls = h => h >= 70 ? 'kdk-g' : h >= 45 ? 'kdk-b' : 'kdk-r';
      const avgHp = () => { const h = here(); return h.length ? h.reduce((a, m) => a + m.hp, 0) / h.length : 0; };
      const foodLb = () => FOODS.reduce((a, k) => a + S.g[k], 0) + S.g.fresh;
      const unitsOf = k => S.g[k] / GOOD[k].per;
      function weight() {
        let w = S.g.fresh;
        GOODS.forEach(g => { if (g.k !== 'horses') w += S.g[g.k] * g.lb / g.per; });
        return w;
      }

      /* ---------- sound and music ---------- */
      const tone = (f, d = 0.08, o = {}) => { if (opt.sound) api.tone(f, d, Object.assign({ type: 'square', vol: 0.05 }, o)); };
      const sfx = n => { if (opt.sound && api.sfx[n]) api.sfx[n](); };
      const jingle = (notes, type = 'square') => { if (opt.sound) notes.forEach(([n, at, d]) => api.tone(api.midi(n), d || 0.14, { type, vol: 0.05, at })); };
      const J_GOOD = [[67, 0], [72, 0.1], [76, 0.2], [79, 0.3, 0.3]];
      const J_BAD = [[64, 0], [60, 0.16], [55, 0.32, 0.4]];
      const J_ARRIVE = [[60, 0], [64, 0.12], [67, 0.24], [72, 0.36, 0.35]];
      const J_WIN = [[60, 0], [64, 0.14], [67, 0.28], [72, 0.42], [67, 0.56], [72, 0.7], [76, 0.84], [79, 0.98, 0.7]];
      function music(name) {
        if (!opt.music || !name) { if (curSong) { api.stopMusic(); curSong = null; } return; }
        if (curSong === name) return;
        curSong = name;
        try { api.playMusic(Object.assign({ gain: 0.5 }, SONGS[name])); } catch (e) { /* no audio */ }
      }

      /* ---------- canvas primitives ---------- */
      function R(x, y, w, h, c) { ctx.fillStyle = PAL[c] || c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
      const tw = (str, s = 1) => String(str).length * 6 * s - s;
      function txt(str, x, y, c, s = 1, center, shadow) {
        str = String(str).toUpperCase();
        if (center) x = Math.round(x - tw(str, s) / 2);
        if (shadow) txt(str, x + s, y + s, shadow, s);
        ctx.fillStyle = PAL[c] || c;
        for (let k = 0; k < str.length; k++) {
          const g = FONT[str[k]]; if (!g) continue;
          for (let row = 0; row < 7; row++) {
            const bits = parseInt(g.substr(row * 2, 2), 16);
            for (let b = 0; b < 5; b++) if (bits & (16 >> b)) ctx.fillRect(Math.round(x + k * 6 * s + b * s), Math.round(y + row * s), s, s);
          }
        }
      }
      function label(str, x, y, fg = 'y', bg = 'k') { const w = tw(str) + 6; R(x - w / 2, y - 2, w, 11, bg); txt(str, x, y, fg, 1, true); }
      let seed = 1;
      const srand = n => { seed = n; };
      const sr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      function sky(cols, y0 = 0, y1 = 100) { const h = (y1 - y0) / cols.length; R(0, y1, LW, LH - y1, cols[cols.length - 1]); cols.forEach((c, i) => R(0, y0 + i * h, LW, h + 1, c)); }
      function ridge(off, base, amp, f1, f2, col, cap, to = LH) {
        for (let x = 0; x < LW; x += 2) {
          const u = x + off;
          const h = base - amp * (0.55 * Math.sin(u / f1) + 0.3 * Math.sin(u / f2 + 1.3) + 0.15 * Math.sin(u / 7.3));
          R(x, h, 2, to - h, col);
          if (cap && h < base - amp * 0.25) R(x, h, 2, Math.max(2, (base - amp * 0.25 - h) * 0.6), cap);
        }
      }
      function spruce(x, base, h, col = 'D', snow) {
        R(x, base - 2, 1, 3, 'N');
        for (let i = 0; i < h; i++) { const w = Math.floor(i * 0.42); R(x - w, base - 2 - h + i, w * 2 + 1, 1, col); if (snow && i % 3 === 1) R(x - w, base - 2 - h + i, Math.max(1, w), 1, 'w'); }
      }
      function tent(x, base, w, h, col = 'e', shade = 't') {
        for (let i = 0; i < h; i++) { const ww = Math.round(w * (i + 1) / h); R(x - ww / 2, base - h + i, ww, 1, i > h * 0.35 && i % 2 ? shade : col); }
        R(x - 1, base - Math.round(h * 0.55), 2, Math.round(h * 0.55), 'N');
      }
      function smoke(x, y, t) { for (let i = 0; i < 4; i++) { const k = ((t / 700) + i / 4) % 1; R(x + Math.sin(k * 6 + i) * 3 + k * 6, y - k * 22, 3 - Math.floor(k * 2), 3 - Math.floor(k * 2), 'l'); } }
      function walker(x, y, shirt, t, moving, o = {}) {
        const f = moving ? Math.floor(t / 170 + (o.ph || 0)) % 2 : 0, lean = o.lean || 0;
        R(x + 1 + lean, y, 5, 1, o.hat || 'N'); R(x + lean, y + 1, 7, 1, o.hat || 'N');
        R(x + 2 + lean, y + 2, 4, 3, 'f'); R(x + 5 + lean, y + 3, 1, 1, 'k');
        if (o.beard) R(x + 2 + lean, y + 4, 4, 1, o.beard);
        R(x + 1, y + 5, 5, 5, shirt); R(x + 5, y + 6, 2, 3, shirt);
        if (o.pack !== false) { R(x - 3, y + 4, 4, 7, 'n'); R(x - 3, y + 4, 4, 1, 't'); R(x - 2, y + 7, 2, 1, 'N'); }
        if (f) { R(x + 1, y + 10, 2, 4, 'N'); R(x + 4, y + 10, 2, 3, 'N'); R(x + 5, y + 13, 2, 1, 'k'); R(x, y + 13, 2, 1, 'k'); }
        else { R(x + 2, y + 10, 3, 4, 'N'); R(x + 2, y + 13, 4, 1, 'k'); }
      }
      function tiny(x, y, c = 'k', t = 0, ph = 0) { R(x, y, 2, 2, 'f'); R(x, y + 2, 2, 3, c); R(x - 2, y + 1, 2, 3, 'n'); R(x + ((Math.floor(t / 200 + ph)) % 2), y + 5, 1, 2, 'N'); }
      function sled(x, y) { R(x, y + 4, 20, 1, 'N'); R(x + 20, y + 2, 1, 2, 'N'); R(x + 2, y, 16, 4, 'n'); R(x + 3, y - 3, 12, 3, 't'); R(x + 3, y - 3, 12, 1, 'e'); }
      function horse(x, y, t, moving) {
        const f = moving ? Math.floor(t / 160) % 2 : 0;
        R(x, y + 3, 18, 7, 'n'); R(x + 16, y, 5, 5, 'n'); R(x + 20, y + 2, 3, 3, 'n'); R(x + 16, y - 1, 2, 2, 'N'); R(x - 2, y + 3, 2, 5, 'N');
        R(x + 3, y, 11, 4, 't'); R(x + 3, y, 11, 1, 'e');
        R(x + 1 + f, y + 10, 2, 5, 'N'); R(x + 5 - f, y + 10, 2, 5, 'N'); R(x + 12 + f, y + 10, 2, 5, 'N'); R(x + 15 - f, y + 10, 2, 5, 'N');
      }
      function steamer(x, y, t) {
        const bob = Math.floor(t / 400) % 2;
        y += bob;
        R(x, y + 10, 90, 10, 'k'); R(x + 3, y + 20, 84, 3, 'k'); R(x, y + 14, 90, 2, 'r'); R(x + 90, y + 10, 6, 6, 'k'); R(x + 96, y + 10, 2, 3, 'k');
        R(x + 12, y + 2, 56, 8, 'w'); for (let i = 0; i < 9; i++) R(x + 15 + i * 6, y + 4, 3, 3, 'b');
        R(x + 38, y - 12, 7, 14, 'k'); R(x + 38, y - 10, 7, 2, 'r');
        R(x + 20, y - 18, 1, 20, 'N'); R(x + 64, y - 16, 1, 18, 'N');
        for (let i = 0; i < 16; i++) R(x + 10 + i * 5, y + 8, 2, 2, i % 3 ? 'k' : 'n');
        for (let i = 0; i < 5; i++) { const k = ((t / 900) + i / 5) % 1; R(x + 40 - k * 40, y - 16 - k * 14, 4 + k * 5, 3 + k * 3, k < 0.5 ? 'd' : 'l'); }
      }
      function boat(x, y, t, o = {}) {
        const bob = Math.floor(t / 350) % 2;
        y += o.moving ? bob : 0;
        R(x + 2, y + 8, 40, 3, 'N'); R(x, y + 5, 46, 4, 'n'); R(x - 2, y + 4, 4, 2, 'n'); R(x + 44, y + 3, 5, 3, 'n'); R(x, y + 5, 46, 1, 't');
        if (o.sail) { R(x + 20, y - 18, 1, 23, 'N'); for (let i = 0; i < 16; i++) R(x + 21, y - 17 + i, Math.floor(i * 0.9) + 2, 1, i % 4 ? 'e' : 'l'); }
        const n = o.n == null ? 5 : o.n, shirts = ['r', 'b', 'g', 'm', 'c'];
        for (let i = 0; i < n; i++) { const px = x + 5 + i * 8; R(px, y - 3, 4, 2, 'N'); R(px, y - 1, 4, 3, 'f'); R(px, y + 2, 4, 3, shirts[i % 5]); }
        if (o.goods) { R(x + 30, y, 12, 5, 't'); R(x + 30, y, 12, 1, 'e'); }
        if (o.moving) { const a = Math.floor(t / 300) % 2; R(x + 10, y + 3, 1, 1, 'N'); R(x + 10 - (a ? 5 : 2), y + 4 + (a ? 5 : 3), 6, 1, 'N'); R(x + 26, y + 3, 1, 1, 'N'); R(x + 26 - (a ? 5 : 2), y + 4 + (a ? 5 : 3), 6, 1, 'N'); }
      }
      function mountie(x, y, t) {
        R(x, y, 10, 2, 'N'); R(x + 2, y - 3, 6, 3, 'N'); R(x + 3, y - 2, 4, 1, 'n');
        R(x + 2, y + 2, 6, 5, 'f'); R(x + 3, y + 4, 1, 1, 'k'); R(x + 6, y + 4, 1, 1, 'k'); R(x + 3, y + 6, 4, 1, 'N');
        R(x + 1, y + 7, 8, 9, 'r'); R(x + 4, y + 8, 2, 7, 'y'); R(x + 1, y + 13, 8, 1, 'N');
        const wave = Math.floor(t / 500) % 3 === 0; R(x - 2, y + (wave ? 3 : 8), 3, 6, 'r'); R(x + 9, y + 8, 3, 6, 'r');
        R(x + 2, y + 16, 3, 8, 'b'); R(x + 5, y + 16, 3, 8, 'b'); R(x + 2, y + 16, 1, 8, 'y'); R(x + 7, y + 16, 1, 8, 'y'); R(x + 1, y + 23, 4, 2, 'k'); R(x + 5, y + 23, 4, 2, 'k');
      }
      function flag(x, y, t) {
        R(x, y, 1, 30, 'l');
        for (let i = 0; i < 16; i++) { const wv = Math.round(Math.sin(t / 250 + i / 3)); R(x + 1 + i, y + 1 + wv, 1, 10, 'r'); }
        R(x + 1, y + 1, 7, 5, 'b'); R(x + 1, y + 3, 7, 1, 'w'); R(x + 4, y + 1, 1, 5, 'w'); R(x + 4, y + 3, 1, 1, 'r');
      }
      function snowfall(t, n = 60, heavy) {
        for (let i = 0; i < n; i++) { const x = (i * 53 + t * (heavy ? 0.09 : 0.02) + Math.sin(t / 700 + i) * 6) % LW, y = (i * 37 + t * (heavy ? 0.06 : 0.035)) % LH; R(x, y, heavy ? 2 : 1, heavy ? 2 : 1, 'w'); }
      }
      function rain(t, n = 70) { for (let i = 0; i < n; i++) { const x = (i * 47 + t * 0.05) % LW, y = (i * 29 + t * 0.3) % LH; R(x, y, 1, 4, 'B'); } }
      function aurora(t, y0 = 18) {
        for (let x = 0; x < LW; x += 2) {
          const y = y0 + Math.sin(x / 34 + t / 1100) * 9 + Math.sin(x / 13 + t / 1500) * 4, h = 10 + Math.sin(x / 21 + t / 800) * 5;
          R(x, y, 2, 2, 'G'); R(x, y + 2, 2, h * 0.5, 'g'); R(x, y + 2 + h * 0.5, 2, h * 0.5, 'D');
          if (vga && x % 6 === 0) R(x, y - 3, 2, 2, 'M');
        }
      }
      function stars(n = 40, maxY = 70, t = 0) { srand(7); for (let i = 0; i < n; i++) { const x = sr() * LW, y = sr() * maxY; R(x, y, 1, 1, Math.sin(t / 500 + i) > 0.7 ? 'l' : 'w'); } }

      /* ---------- seasons and weather (needed by the scenes) ---------- */
      function place() {
        if (!S) return 'town';
        if (S.mi < 1000) return S.mi <= 0 ? 'town' : 'sea';
        if (S.launched) return 'water';
        return 'trail';
      }
      function snowGround() {
        if (!S) return true;
        const x = doy(today()), p = place();
        if (p === 'town' && S.mi <= 0) return false;
        if (p === 'sea') return false;
        if (p === 'trail' && !(S.atLm === 'skagway' || S.atLm === 'dyea')) return x >= 283 || x < 140;
        if (p === 'water') return x >= 290 || x < 125;
        return x >= 319 || x < 85;
      }
      function onLake() { if (!S || !S.launched) return false; const r = S.mi - S.bennettMi; return LAKES.some(([a, b]) => r >= a && r <= b); }
      function skyCols() {
        const w = S && S.wx ? S.wx.sky : 'Clear';
        if (/Blizzard|Heavy snow/.test(w)) return vga ? ['#606878', '#707888', '#8890a0', '#a0a8b8'] : ['d', 'd', 'l', 'l'];
        if (/Snow|Rain|Cloudy|Fog/.test(w)) return vga ? ['#586888', '#687898', '#8898b8', '#a8b8d0'] : ['d', 'a', 'a', 'l'];
        return vga ? ['#2040b0', '#3060d0', '#5088e8', '#88b8ff'] : ['b', 'B', 'B', 'C'];
      }
      function weatherFx(t) {
        const w = S && S.wx ? S.wx.sky : '';
        if (w === 'Blizzard') { ctx.fillStyle = 'rgba(220,230,255,.35)'; ctx.fillRect(0, 0, LW, LH); snowfall(t, 110, true); }
        else if (w === 'Heavy snow') snowfall(t, 90, true);
        else if (w === 'Snow') snowfall(t, 50);
        else if (w === 'Heavy rain') rain(t, 110);
        else if (w === 'Rain') rain(t, 50);
        else if (w === 'Fog') { ctx.fillStyle = 'rgba(200,200,210,.45)'; ctx.fillRect(0, 0, LW, LH); }
      }

      /* ---------- scenes ---------- */
      function titleScene(t) {
        sky(['k', 'k', 'b', 'b', '#0000cc'], 0, 120);
        stars(50, 90, t); aurora(t, 12);
        ridge(40, 96, 22, 40, 17, 'A', 's');
        for (let x = 0; x < LW; x += 2) {
          const h = 128 - Math.max(0, 96 - Math.abs(x - 176) * 0.78) + Math.sin(x / 5) * 1.5;
          R(x, h, 2, 130 - h, x > 176 ? 'l' : 'w'); if (x > 176 && x < 186) R(x, h, 2, 4, 'w');
        }
        for (let i = 0; i < 14; i++) {
          const k = ((i / 14) + t / 60000) % 1, x = 76 + k * 96, y = 128 - Math.max(0, 96 - Math.abs(x - 176) * 0.78) - 7;
          tiny(x, y, 'k', t, i);
        }
        R(0, 112, LW, 48, 'b'); R(0, 112, LW, 2, 'B');
        for (let i = 0; i < 9; i++) spruce(8 + i * 37 + (i % 2) * 9, 124 - (i % 3), 16 + (i % 3) * 4, 'k', true);
        txt('KLONDIKE TRAIL', 160, 122, 'y', 3, true, 'r');
        txt('SEATTLE TO DAWSON CITY  1897-1898', 160, 148, 'C', 1, true);
      }
      function seattleScene(t) {
        sky(skyCols(), 0, 92);
        ridge(10, 70, 12, 30, 11, 'a', 'w', 92);
        R(0, 88, LW, 72, 'b');
        for (let i = 0; i < 26; i++) R(((i * 47 + t * 0.01) % 330) - 10, 96 + (i * 13) % 60, 8, 1, 'B');
        const signs = ['GOODS', 'MEALS', 'TOOLS', 'BOOTS'], cols = ['n', 't', 'e', 'l'];
        for (let i = 0; i < 4; i++) {
          const x = 4 + i * 40, h = 30 + (i % 2) * 8;
          R(x, 92 - h, 38, h, cols[i]); R(x, 92 - h - 6, 38, 6, cols[i]); R(x, 92 - h - 6, 38, 1, 'k');
          R(x + 3, 92 - h - 4, 32, 8, 'k'); txt(signs[i].slice(0, 5), x + 19, 92 - h - 3, 'y', 1, true);
          R(x + 6, 72, 8, 10, 'b'); R(x + 24, 72, 8, 10, 'b'); R(x + 15, 80, 7, 12, 'N');
        }
        R(0, 92, 175, 6, 'N'); for (let x = 4; x < 175; x += 12) R(x, 98, 2, 10, 'N');
        steamer(190, 66, t); txt('S.S. NORTHERN STAR', 238, 110, 'w', 1, true);
        for (let i = 0; i < 12; i++) tiny(20 + i * 12 + (i % 3) * 2, 85, ['r', 'b', 'g', 'k', 'n'][i % 5], t, i);
        R(140, 86, 12, 6, 't'); R(142, 81, 9, 5, 'n'); R(154, 86, 10, 6, 'e');
        weatherFx(t);
      }
      function storeScene(t) {
        R(0, 0, LW, LH, 'N');
        for (let x = 0; x < LW; x += 12) R(x, 0, 1, 118, '#4a2808');
        R(0, 118, LW, 42, 'n'); for (let y = 122; y < LH; y += 8) R(0, y, LW, 1, 'N');
        R(60, 4, 200, 14, 'k'); txt('PUGET SOUND OUTFITTING CO.', 160, 8, 'y', 1, true);
        srand(5);
        [[6, 30], [6, 58], [6, 86], [216, 30], [216, 58], [216, 86]].forEach(([sx, sy]) => {
          R(sx, sy + 18, 98, 3, 't');
          for (let x = sx + 2; x < sx + 92;) {
            const kind = Math.floor(sr() * 4), w = kind === 0 ? 14 : 8, h = kind === 0 ? 14 : 10 + Math.floor(sr() * 6);
            R(x, sy + 18 - h, w, h, ['e', 'r', 'l', 'g'][kind]); R(x, sy + 18 - h, w, 1, 'k');
            if (kind === 0) R(x + 2, sy + 10, w - 4, 2, 'N');
            x += w + 2;
          }
        });
        const kx = 150, blink = Math.floor(t / 1700) % 7 === 0;
        R(kx - 2, 34, 24, 4, 'g'); R(kx + 1, 38, 18, 18, 'f');
        R(kx + 4, 43, 3, 2, blink ? 'f' : 'k'); R(kx + 13, 43, 3, 2, blink ? 'f' : 'k');
        R(kx + 3, 49, 14, 2, 'N'); R(kx + 8, 52, 4, 1, 'r');
        R(kx - 4, 56, 28, 30, 'w'); R(kx - 4, 56, 28, 3, 'l'); R(kx + 6, 58, 8, 28, 'e');
        const arm = Math.floor(t / 400) % 2; R(kx + 24, arm ? 52 : 58, 4, 12, 'f');
        R(40, 86, 240, 32, 't'); R(40, 86, 240, 3, 'e'); R(40, 117, 240, 1, 'k');
        R(58, 72, 26, 14, 'l'); R(62, 75, 18, 5, 'k'); txt('$', 71, 75, 'G', 1, true);
        R(200, 76, 34, 10, 'e'); R(206, 70, 20, 6, 'n'); R(226, 66, 8, 20, 'l');
        txt('FLOUR', 100, 96, 'N', 1, false); txt('BACON', 170, 96, 'N', 1, false);
      }
      function seaScene(t, o) {
        const storm = S && /rain|Blizzard|snow/i.test(S.wx.sky);
        sky(skyCols(), 0, 90);
        const off = t * 0.01 + (S ? S.mi * 2 : 0);
        ridge(off * 0.4, 70, 14, 26, 9, 'a', 'w', 90);
        ridge(off, 84, 10, 18, 7, 'D', null, 90);
        R(0, 88, LW, 72, 'b');
        for (let i = 0; i < 40; i++) { const x = ((i * 41 - t * 0.04) % 340 + 340) % 340 - 10, y = 92 + (i * 17) % 66; R(x, y, 6 + (i % 3) * 3, 1, i % 4 ? 'B' : 'C'); }
        steamer(110, 62 + (storm ? Math.round(Math.sin(t / 300) * 2) : 0), t);
        if (o.whales) { const k = (t / 1500) % 1; R(40, 100, 14, 3, 'd'); if (k < 0.4) { R(46, 90 - k * 10, 1, 8, 'w'); R(44, 88 - k * 10, 5, 1, 'w'); } }
        weatherFx(t);
      }
      function skagwayScene(t) {
        sky(skyCols(), 0, 100);
        ridge(0, 40, 30, 22, 9, 'A', 'w', 110); ridge(60, 70, 18, 16, 7, 'D', snowGround() ? 's' : null, 110);
        R(0, 100, LW, 60, snowGround() ? 's' : 'n'); R(0, 114, LW, 16, snowGround() ? 'w' : 'N');
        const signs = ['MEALS', 'FREIGHT', 'HOTEL', 'OUTFITS', 'LUMBER', 'BAKERY'], cols = ['n', 't', 'e', 'l', 'c', 'r'];
        for (let i = 0; i < 6; i++) {
          const x = 2 + i * 48, h = 22 + (i % 3) * 5;
          R(x, 108 - h, 44, h, cols[i]); R(x, 100 - h, 44, 9, cols[i]); R(x, 100 - h, 44, 1, 'k');
          R(x + 1, 101 - h, 42, 8, 'k'); txt(signs[i], x + 22, 101 - h, 'y', 1, true);
          R(x + 5, 96 - h + 16, 7, 7, 'b'); R(x + 32, 96 - h + 16, 7, 7, 'b'); R(x + 18, 96, 8, 12, 'N');
        }
        for (let i = 0; i < 5; i++) tent(28 + i * 60, 72 - (i % 2) * 4, 16, 9);
        for (let i = 0; i < 16; i++) { const x = ((i * 31 + t * 0.012 * (i % 2 ? 1 : -1)) % 340 + 340) % 340 - 10; tiny(x, 118 + (i % 3) * 5, ['k', 'r', 'b', 'N'][i % 4], t, i); }
        R(0, 136, LW, 24, 'b'); for (let x = 190; x < 320; x += 10) R(x, 132, 2, 10, 'N'); R(186, 131, 134, 3, 'N');
        weatherFx(t);
      }
      function dyeaScene(t) {
        sky(skyCols(), 0, 90);
        ridge(30, 44, 26, 20, 8, 'A', 'w', 96); ridge(90, 74, 14, 15, 6, 'D', snowGround() ? 's' : null, 96);
        R(0, 92, LW, 36, snowGround() ? 's' : 't'); R(0, 128, LW, 32, 'a'); R(0, 146, LW, 14, 'b');
        for (let i = 0; i < 20; i++) R((i * 29) % LW, 131 + (i * 7) % 14, 10, 1, 'l');
        for (let i = 0; i < 7; i++) tent(20 + i * 44, 100 - (i % 2) * 3, 18, 10);
        srand(4);
        for (let i = 0; i < 14; i++) { const x = 10 + sr() * 290, y = 108 + sr() * 14; R(x, y, 8, 6, ['e', 't', 'n', 'l'][i % 4]); R(x, y, 8, 1, 'k'); }
        R(230, 138, 30, 5, 'N'); R(232, 136, 26, 2, 'n');
        for (let i = 0; i < 12; i++) { const x = ((i * 27 + t * 0.015) % 330) - 5; tiny(x, 112 + (i % 3) * 5, ['k', 'b', 'r'][i % 3], t, i); }
        weatherFx(t);
      }
      function campScene(t, o) {
        const snow = snowGround();
        srand(o.seed || 3);
        sky(skyCols(), 0, 90);
        ridge(o.seed * 20 || 0, 50, 26, 24, 9, 'A', 'w', 100); ridge(o.seed * 40 || 0, 80, 12, 17, 6, snow ? 's' : 'D', snow ? 'w' : null, 104);
        R(0, 100, LW, 60, snow ? 'w' : 'g'); R(0, 124, LW, 8, snow ? 's' : 'n');
        for (let i = 0; i < 12; i++) spruce(sr() * LW, 100 + sr() * 8, 12 + sr() * 12, 'D', snow);
        for (let i = 0; i < 8; i++) { const x = 20 + i * 38 + sr() * 10, b = 118 + (i % 2) * 18; tent(x, b, 18, 11); if (i % 3 === 0) smoke(x + 3, b - 12, t + i * 300); }
        for (let i = 0; i < 8; i++) { const x = ((i * 43 + t * 0.012) % 340) - 10; tiny(x, 124, ['k', 'r', 'b', 'N'][i % 4], t, i); }
        weatherFx(t);
      }
      function slopeY(x) { return 158 - x * 0.5; }
      function scalesScene(t) {
        const snow = snowGround();
        sky(skyCols(), 0, 60);
        for (let x = 0; x < LW; x += 2) { const y = x < 140 ? 110 - x * 0.1 : 96 - (x - 140) * 0.45; R(x, y, 2, LH - y, snow ? 'w' : 'l'); if (x >= 140) R(x, y, 2, 2, snow ? 's' : 'd'); }
        R(290, 14, 30, 4, snow ? 'w' : 'l');
        for (let i = 0; i < 22; i++) { const k = ((i / 22) + t / 90000) % 1, x = 150 + k * 150; tiny(x, 96 - (x - 140) * 0.45 - 7, 'k', t, i); }
        srand(9);
        for (let i = 0; i < 12; i++) { const x = 8 + sr() * 120, y = 116 + sr() * 26; R(x, y, 12, 7, ['e', 't', 'n'][i % 3]); R(x - 1, y - 1, 14, 2, 'd'); }
        for (let i = 0; i < 3; i++) tent(30 + i * 40, 112, 16, 10);
        label('THE SCALES', 70, 88, 'y', 'N');
        R(64, 97, 2, 14, 'N');
        weatherFx(t);
      }
      function stairsScene(t, o) {
        const snow = snowGround();
        sky(skyCols(), 0, 100);
        ridge(0, 50, 20, 30, 12, 'A', 'w', 120);
        for (let x = 0; x < LW; x += 2) { const y = slopeY(x); R(x, y, 2, LH - y, snow ? 'w' : 'l'); R(x, y, 2, 1, snow ? 's' : 'd'); if (x % 6 === 0) R(x, y - 1, 4, 1, snow ? 'a' : 'k'); if (!snow && x % 14 === 0) R(x, y + 6, 5, 3, 'd'); }
        R(292, 12, 28, 4, 'N'); flag(302, 2, t);
        for (let i = 0; i < 26; i++) { const k = ((i / 26) + t / 70000) % 1, x = k * 300; tiny(x, slopeY(x) - 8, i % 5 === 0 ? 'N' : 'k', t, i); }
        const prog = o.prog || 0;
        ['r', 'b', 'g', 'm', 'c'].slice(0, Math.max(1, o.n || 5)).forEach((c, i) => {
          const x = 20 + prog * 250 - i * 14; if (x < 0) return;
          walker(x, slopeY(x + 3) - 15, c, t, prog > 0 && prog < 1, { lean: 1, ph: i });
        });
        R(2, 2, 136, 22, 'k');
        txt('LOADS AT THE TOP', 6, 5, 'C'); txt((o.up || 0) + ' OF ' + (o.total || 0), 6, 14, 'y');
        weatherFx(t);
      }
      function summitScene(t, o) {
        const snow = snowGround();
        sky(skyCols(), 0, 100);
        for (let x = 0; x < LW; x += 2) { const y = 30 + Math.abs(x - 160) * 0.5 + Math.sin(x / 9) * 2; R(x, y, 2, LH - y, snow ? 'w' : 'l'); if (x > 160) R(x, y, 2, 3, snow ? 's' : 'd'); }
        R(0, 112, LW, 48, snow ? 'w' : 'a');
        R(190, 84, 44, 30, 'n'); for (let y = 88; y < 114; y += 4) R(190, y, 44, 1, 'N'); R(186, 80, 52, 5, snow ? 'w' : 'N'); R(206, 100, 10, 14, 'N');
        flag(244, 70, t);
        if (o.mountie !== false) mountie(170, 88, t);
        srand(12);
        for (let i = 0; i < 10; i++) { const x = 20 + sr() * 130, y = 110 + sr() * 30; R(x, y, 12, 7, ['e', 't', 'n'][i % 3]); R(x - 1, y - 1, 14, 2, snow ? 's' : 'd'); }
        if (o.party) ['r', 'b', 'g', 'm', 'c'].slice(0, o.party).forEach((c, i) => walker(110 + i * 12, 120, c, t, false, { ph: i }));
        weatherFx(t);
      }
      function lakeScene(t, o) {
        const snow = snowGround(), ice = S && frozen();
        sky(skyCols(), 0, 80);
        ridge((o.seed || 1) * 30, 52, 24, 26, 10, 'A', 'w', 90);
        R(0, 82, LW, 30, ice ? 's' : 'b');
        if (!ice) for (let i = 0; i < 24; i++) R(((i * 37 + t * 0.012) % 330) - 5, 86 + (i * 7) % 24, 7, 1, 'B'); else for (let i = 0; i < 12; i++) R((i * 29) % LW, 88 + (i * 5) % 20, 16, 1, 'w');
        R(0, 110, LW, 50, snow ? 'w' : 'g'); R(0, 110, LW, 2, snow ? 's' : 'n');
        srand(o.seed || 2);
        for (let i = 0; i < 9; i++) spruce(sr() * LW, 112 + sr() * 6, 10 + sr() * 10, 'D', snow);
        for (let i = 0; i < 5; i++) { const x = 30 + i * 60, b = 132 + (i % 2) * 12; tent(x, b, 18, 11); if (i % 2) smoke(x + 3, b - 12, t + i * 300); }
        if (o.boat && !ice) boat(200, 90, t, { n: 0 });
        weatherFx(t);
      }
      function bennettScene(t) {
        const snow = snowGround(), ice = S && frozen();
        sky(skyCols(), 0, 74);
        ridge(10, 44, 26, 28, 11, 'A', 'w', 80);
        R(0, 72, LW, 26, ice ? 's' : 'b');
        if (!ice) { for (let i = 0; i < 22; i++) R(((i * 37 + t * 0.012) % 330) - 5, 76 + (i * 7) % 20, 7, 1, 'B'); boat(60, 78, t, { n: 3, sail: true, moving: true }); }
        R(0, 96, LW, 64, snow ? 'w' : 't'); R(0, 96, LW, 2, snow ? 's' : 'n');
        srand(21);
        for (let i = 0; i < 16; i++) tent(10 + i * 20 + sr() * 8, 104 + (i % 3) * 3, 14, 8);
        for (let i = 0; i < 3; i++) { const x = 30 + i * 100; R(x, 128, 40, 2, 'n'); for (let j = 0; j < 7; j++) R(x + 3 + j * 6, 120 + Math.abs(j - 3), 1, 8 - Math.abs(j - 3), 'N'); }
        const up = Math.floor(t / 250) % 2;
        R(250, 132, 50, 4, 'N'); R(254, 136, 3, 12, 'N'); R(294, 136, 3, 12, 'N');
        walker(266, 116 + up, 'r', t, false, { pack: false }); walker(270, 138 - up, 'b', t, false, { pack: false });
        R(272, 124 + up, 1, 22, 'l');
        for (let i = 0; i < 6; i++) spruce(8 + i * 58, 150, 10, 'D', snow);
        weatherFx(t);
      }
      function sawScene(t, o) {
        const snow = snowGround();
        sky(skyCols(), 0, 70);
        ridge(80, 48, 18, 28, 11, 'A', 'w', 80);
        R(0, 76, LW, 84, snow ? 'w' : 't'); R(0, 76, LW, 2, snow ? 's' : 'n');
        for (let i = 0; i < 6; i++) spruce(10 + i * 22, 84, 14 + (i % 3) * 4, 'D', snow);
        const up = Math.floor(t / 220) % 2;
        R(20, 100, 110, 6, 'n'); R(20, 100, 110, 1, 't'); R(26, 106, 4, 34, 'N'); R(120, 106, 4, 34, 'N');
        walker(66, 84 - up, 'r', t, false, { pack: false, hat: 'k' }); walker(70, 124 + up, 'b', t, false, { pack: false });
        R(72, 90 - up * 2, 1, 44, 'l'); R(70, 90 - up * 2, 5, 2, 'N'); R(70, 132 - up * 2, 5, 2, 'N');
        const p = clamp(o.prog || 0, 0, 1);
        R(160, 132, 130, 3, 'N');
        const planks = Math.floor(p * 8);
        for (let j = 0; j < 9; j++) R(168 + j * 13, 110 + Math.abs(j - 4) * 2, 2, 22 - Math.abs(j - 4) * 2, 'N');
        for (let i = 0; i < planks; i++) R(166 + (i % 2) * 2, 128 - i * 2.5, 116 - (i % 2) * 4, 2, i % 2 ? 'n' : 't');
        if (p >= 1) { R(164, 108, 122, 22, 'n'); R(164, 108, 122, 2, 't'); txt('READY!', 225, 115, 'y', 1, true, 'k'); }
        R(150, 140, 30, 4, 't'); R(150, 144, 30, 4, 'n'); R(186, 142, 20, 4, 't');
        label('BOAT ' + Math.round(p * 100) + '%', 225, 150, 'y', 'N');
        weatherFx(t);
      }
      function riverScene(t, o) {
        const lake = onLake(), snow = snowGround(), off = (S ? S.mi * 6 : 0) + (o.moving ? t * 0.03 : 0);
        sky(skyCols(), 0, 80);
        ridge(off * 0.15, lake ? 56 : 50, 20, 30, 12, 'A', 'w', 90);
        ridge(off * 0.4, lake ? 78 : 72, lake ? 5 : 10, 18, 7, snow ? 's' : 'D', null, 90);
        const wy = lake ? 80 : 86;
        R(0, wy, LW, LH - wy, 'b');
        if (!lake) { R(0, wy, LW, 6, snow ? 'w' : 'g'); srand(3); for (let i = 0; i < 20; i++) { const x = ((i * 23 - off * 0.7) % 460 + 460) % 460 - 20; spruce(x, wy + 4, 8 + (i % 4) * 3, 'D', snow); } }
        for (let i = 0; i < 40; i++) { const x = ((i * 41 - off * (0.9 + (i % 3) * 0.2)) % 340 + 340) % 340 - 10, y = wy + 6 + (i * 17) % (LH - wy - 8); R(x, y, 5 + (i % 3) * 3, 1, i % 5 ? 'B' : 'C'); }
        if (S && S.slush) for (let i = 0; i < 12; i++) { const x = ((i * 53 - off * 0.8) % 340 + 340) % 340 - 10; R(x, wy + 12 + (i * 11) % 50, 9, 3, 'w'); }
        if (o.others) for (let i = 0; i < 3; i++) { const x = ((i * 120 - off * 0.3 + t * 0.005) % 380 + 380) % 380 - 50; boat(x, wy + 6 + i * 3, t, { n: 3, sail: i === 1, moving: true }); }
        boat(126, 112, t, { moving: o.moving, n: S ? here().length : 5, goods: true, sail: lake && S && S.wx.sky === 'Clear' });
        if (!lake) { R(0, LH - 8, LW, 8, snow ? 'w' : 'g'); for (let i = 0; i < 10; i++) { const x = ((i * 41 - off * 1.4) % 400 + 400) % 400 - 20; spruce(x, LH + 2, 12, 'D', snow); } }
        weatherFx(t);
      }
      function canyonScene(t) {
        sky(skyCols(), 0, 40);
        R(0, 30, LW, 130, 'b');
        for (let x = 0; x < LW; x += 3) R(x, 60 + ((x * 7 + Math.floor(t / 80)) % 11), 2, 1, 'w');
        for (let i = 0; i < 40; i++) R(((i * 29 + t * 0.06) % 330) - 5, 48 + (i * 13) % 110, 7, 1, i % 2 ? 'w' : 'C');
        for (let y = 20; y < LH; y += 2) {
          const l = 90 + (y - 20) * 0.2 + Math.sin(y / 9) * 3, r = 230 - (y - 20) * 0.2 + Math.sin(y / 7) * 3;
          R(0, y, l, 2, y % 8 < 4 ? 'd' : 'A'); R(r, y, LW - r, 2, y % 8 < 4 ? 'd' : 'A');
        }
        for (let x = 4; x < 90; x += 9) R(x, 20, 1, 140, 'k'); for (let x = 236; x < LW; x += 9) R(x, 20, 1, 140, 'k');
        R(0, 16, 110, 6, 'D'); R(214, 16, 106, 6, 'D');
        boat(140, 100 + Math.sin(t / 200) * 3, t, { n: 0 });
        weatherFx(t);
      }
      function whitehorseScene(t) {
        sky(skyCols(), 0, 70);
        ridge(20, 50, 14, 26, 9, 'A', 'w', 80); R(0, 70, LW, 14, snowGround() ? 'w' : 'g');
        for (let i = 0; i < 12; i++) spruce(i * 28 + 8, 80, 10 + (i % 3) * 3, 'D', snowGround());
        R(0, 82, LW, 78, 'b');
        for (let i = 0; i < 18; i++) {
          const x = ((i * 47 + t * 0.05) % 360) - 30, y = 90 + (i * 23) % 64, ph = Math.floor(t / 150 + i) % 3;
          R(x, y + 2, 18, 3, 'w'); R(x + 3 + ph, y, 10, 2, 'w'); R(x + 12, y - 2 + (ph === 1 ? 1 : 0), 6, 2, 'w'); R(x + 16, y - 4, 3, 2, 'l');
        }
        weatherFx(t);
      }
      function labergeScene(t) {
        sky(skyCols(), 0, 76);
        ridge(60, 62, 12, 34, 13, 'A', 'w', 84); ridge(10, 78, 4, 22, 9, snowGround() ? 's' : 'D', null, 84);
        R(0, 82, LW, 78, 'b');
        for (let i = 0; i < 44; i++) { const x = ((i * 37 + t * 0.03) % 340) - 10, y = 86 + (i * 11) % 72; R(x, y, 6, 1, 'B'); if (i % 4 === 0) R(x + 2, y - 1, 3, 1, 'w'); }
        weatherFx(t);
      }
      function fivefingerScene(t) {
        sky(skyCols(), 0, 60);
        ridge(10, 50, 10, 26, 9, snowGround() ? 's' : 'D', null, 70);
        R(0, 64, LW, 96, 'b');
        for (let i = 0; i < 40; i++) R(((i * 31 + t * 0.05) % 340) - 10, 70 + (i * 13) % 86, 8, 1, i % 3 ? 'B' : 'w');
        for (let i = 0; i < 4; i++) {
          const x = 36 + i * 66, w = 26 + (i % 2) * 6;
          R(x, 70, w, 70, 'n'); R(x + w - 6, 70, 6, 70, 'N'); R(x - 2, 136, w + 4, 6, 'w');
          for (let j = 0; j < 3; j++) spruce(x + 6 + j * 8, 72, 10, 'D', snowGround());
        }
        txt('1', 20, 146, 'y'); txt('2', 86, 146, 'y'); txt('3', 152, 146, 'y'); txt('4', 218, 146, 'y'); txt('5', 292, 146, 'y');
        weatherFx(t);
      }
      function selkirkScene(t) {
        const snow = snowGround();
        sky(skyCols(), 0, 80);
        ridge(30, 64, 12, 30, 12, 'A', 'w', 90);
        R(0, 86, LW, 44, snow ? 'w' : 'g'); R(0, 128, LW, 32, 'b');
        for (let i = 0; i < 20; i++) R(((i * 37 + t * 0.02) % 340) - 10, 132 + (i * 7) % 26, 7, 1, 'B');
        [[40, 96], [110, 92], [190, 98]].forEach(([x, y], i) => { R(x, y, 50, 26, 'n'); for (let yy = y + 3; yy < y + 26; yy += 4) R(x, yy, 50, 1, 'N'); R(x - 3, y - 6, 56, 7, snow ? 'w' : 'N'); R(x + 20, y + 12, 9, 14, 'N'); if (i === 1) smoke(x + 40, y - 12, t); });
        R(262, 60, 1, 60, 'l'); flag(262, 60, t);
        for (let i = 0; i < 5; i++) spruce(250 + i * 14, 124, 14, 'D', snow);
        weatherFx(t);
      }
      function dawsonScene(t) {
        sky(vga ? ['#2050c0', '#3070e0', '#58a0ff', '#a0d0ff'] : ['b', 'B', 'B', 'C'], 0, 70);
        R(262, 12, 14, 14, 'y');
        ridge(0, 44, 18, 40, 15, 'D', null, 90); ridge(50, 64, 8, 24, 9, 'g', null, 90);
        R(0, 80, LW, 50, 't');
        srand(33);
        for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
          const x = i * 27 + row * 9 + sr() * 5, y = 84 + row * 14, c = ['n', 'e', 'l', 'r', 'c', 'w'][Math.floor(sr() * 6)];
          if (sr() < 0.35) tent(x + 8, y + 12, 16, 10); else { R(x, y, 20, 12, c); R(x, y - 3, 20, 3, c); R(x, y - 3, 20, 1, 'k'); R(x + 8, y + 5, 4, 7, 'N'); }
        }
        R(0, 128, LW, 32, 'b');
        for (let i = 0; i < 9; i++) boat(i * 36 - 6, 122, t, { n: 0 });
        for (let i = 0; i < 20; i++) R(((i * 37 + t * 0.02) % 340) - 10, 138 + (i * 7) % 20, 7, 1, 'B');
        for (let i = 0; i < 12; i++) { const x = ((i * 29 + t * 0.01 * (i % 2 ? 1 : -1)) % 340 + 340) % 340 - 10; tiny(x, 120, ['k', 'r', 'b', 'N'][i % 4], t, i); }
        label('DAWSON CITY', 160, 4, 'y', 'r');
      }
      function winterScene(t, o) {
        sky(['k', 'k', 'b', 'b'], 0, 100);
        stars(40, 70, t); aurora(t, 14);
        ridge(20, 80, 16, 30, 11, 'A', 'w', 110);
        R(0, 104, LW, 56, 'w'); R(0, 104, LW, 2, 's'); R(0, 136, LW, 24, 's'); for (let i = 0; i < 10; i++) R(i * 34, 140 + (i % 3) * 5, 22, 1, 'l');
        for (let i = 0; i < 7; i++) spruce(10 + i * 46 + (i % 2) * 10, 108 + (i % 2) * 4, 16 + (i % 3) * 4, 'k', true);
        if (o.cabin) {
          R(120, 90, 60, 26, 'n'); for (let y = 93; y < 116; y += 4) R(120, y, 60, 1, 'N');
          for (let i = 0; i < 10; i++) R(116 + i * 3.5, 84 - i * 1.2, 70 - i * 7, 2, 'w');
          R(146, 100, 9, 16, 'N'); R(126, 98, 8, 7, Math.floor(t / 900) % 5 ? 'y' : 'o'); R(166, 76, 5, 12, 'd'); smoke(167, 72, t);
        } else { tent(150, 118, 30, 18); R(144, 110, 12, 8, Math.floor(t / 700) % 3 ? 'y' : 'o'); smoke(150, 98, t); }
        if (o.sled) sled(200, 110);
      }
      function portrait(t, o) {
        const type = o.who || 'old', bgc = { mountie: 'b', packer: 'c', lady: 'm', clerk: 'g', pilot: 'c', builder: 'n', carp: 'n', trader: 'g', agent: 'b', kid: 'B', cook: 'r', sailor: 'b' }[type] || 'n';
        sky(skyCols(), 0, LH);
        R(100, 6, 120, 148, 'k'); R(104, 10, 112, 140, bgc);
        const x = 124, y = 34, talk = Math.floor(t / 160) % 3, blink = Math.floor(t / 1900) % 8 === 0;
        const coat = { mountie: 'r', lady: 'm', clerk: 'w', kid: 'g', packer: 'N', sailor: 'b', cook: 'w' }[type] || 'n';
        R(x - 12, y + 70, 96, 50, coat); if (type === 'mountie') { R(x + 32, y + 72, 8, 46, 'y'); R(x - 12, y + 96, 96, 4, 'N'); }
        R(x + 20, y + 58, 32, 14, 'f');
        R(x + 8, y + 12, 56, 50, 'f');
        R(x + 18, y + 28, 8, blink ? 2 : 6, 'k'); R(x + 46, y + 28, 8, blink ? 2 : 6, 'k'); if (!blink) { R(x + 20, y + 29, 3, 2, 'w'); R(x + 48, y + 29, 3, 2, 'w'); }
        R(x + 33, y + 34, 6, 12, '#d09060');
        if (type === 'old' || type === 'trader' || type === 'builder' || type === 'pilot') R(x + 8, y + 46, 56, 18, type === 'old' ? 'l' : 'N');
        R(x + 26, y + 50, 20, talk === 1 ? 6 : 3, 'r');
        const hat = { mountie: 'N', lady: 'y', clerk: 'g', kid: 'r', packer: 'k', sailor: 'b', cook: 'w' }[type] || 'N';
        if (type === 'lady') { R(x, y - 2, 72, 18, hat); R(x - 4, y + 12, 80, 6, hat); R(x + 4, y + 16, 8, 30, 'N'); R(x + 60, y + 16, 8, 30, 'N'); }
        else if (type === 'packer') { R(x + 6, y + 4, 60, 14, 'k'); R(x + 6, y + 18, 6, 20, 'k'); R(x + 60, y + 18, 6, 20, 'k'); R(x + 10, y - 2, 52, 8, 'c'); }
        else if (type === 'mountie') { R(x - 6, y + 10, 84, 6, hat); R(x + 10, y - 12, 52, 22, hat); R(x + 20, y - 14, 4, 6, hat); R(x + 48, y - 14, 4, 6, hat); R(x + 10, y + 4, 52, 3, 'n'); }
        else { R(x - 2, y + 8, 76, 6, hat); R(x + 10, y - 8, 52, 18, hat); }
      }
      function mapScene(t) {
        R(0, 0, LW, LH, vga ? '#d8c890' : 't');
        ctx.fillStyle = PAL.B; ctx.beginPath();
        [[0, 104], [60, 108], [120, 100], [170, 97], [200, 97], [214, 102], [236, 112], [262, 124], [282, 136], [292, 146], [288, 160], [0, 160]].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.fill();
        for (let i = 0; i < 30; i++) R((i * 53) % 280, 112 + (i * 17) % 44, 6, 1, 'C');
        srand(8);
        for (let i = 0; i < 26; i++) { const x = 150 + sr() * 110, y = 60 + sr() * 50; if (y < 104 - (x - 150) * -0.1) { R(x, y, 1, 1, 'N'); R(x - 1, y + 1, 3, 1, 'N'); R(x - 2, y + 2, 5, 1, 'n'); } }
        for (let i = 0; i < 40; i += 2) R(22, i * 2.3, 1, 3, 'r');
        [[290, 128], [250, 108], [215, 90], [196, 78], [170, 82], [120, 88], [60, 92], [22, 95]].reduce((a, b) => { for (let k = 0; k < 1; k += 0.06) if (Math.floor(k * 16) % 2 === 0) R(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 1, 1, 'r'); return b; });
        txt('ALASKA (U.S.)', 80, 95, 'r', 1, true); txt('YUKON (CANADA)', 100, 58, 'r', 1, true); txt('PACIFIC OCEAN', 90, 132, 'w', 1, true);
        const riv = [[191, 70], [193, 63], [190, 56], [186, 49], [185, 45], [180, 38], [162, 36], [140, 31], [112, 27], [80, 24], [58, 22], [40, 18]];
        for (let i = 1; i < riv.length; i++) { const a = riv[i - 1], b = riv[i]; for (let k = 0; k <= 1; k += 0.04) R(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 2, 2, 'b'); }
        R(186, 36, 4, 6, 'b'); R(189, 55, 4, 5, 'b'); R(191, 66, 3, 6, 'b');
        const path = routeIds().filter(id => LMS[id].map);
        let prev = null;
        path.forEach(id => { const p = LMS[id].map; if (prev && id !== 'skagway' && prev !== 'seattle') for (let k = 0; k <= 1; k += 0.1) R(prev[0] + (p[0] - prev[0]) * k, prev[1] + (p[1] - prev[1]) * k, 1, 1, 'N'); prev = p; });
        for (let i = 1; i < SEA_PATH.length; i++) { const a = SEA_PATH[i - 1], b = SEA_PATH[i]; for (let k = 0; k < 1; k += 0.15) R(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 1, 1, 'w'); }
        path.forEach(id => { const [x, y] = LMS[id].map, seen = S && S.seen.includes(id); R(x - 1, y - 1, 3, 3, seen ? 'r' : 'k'); });
        [['seattle', 'SEATTLE', -8, -12], ['skagway', 'SKAGWAY', 26, 4], ['bennett', 'BENNETT', 26, -3], ['miles', 'MILES CANYON', 40, -3], ['selkirk', 'FT SELKIRK', 0, 6], ['dawson', 'DAWSON', 0, 6]].forEach(([id, s, dx, dy]) => { const [x, y] = LMS[id].map; txt(s, x + dx, y + dy, 'k', 1, true); });
        if (S) {
          const [x, y] = posOnMap();
          const on = Math.floor(t / 300) % 2;
          R(x - 3, y - 3, 7, 7, on ? 'y' : 'k'); R(x - 1, y - 1, 3, 3, on ? 'r' : 'y');
        }
        R(4, 140, 84, 16, 'k'); txt('N', 8, 144, 'y'); txt('NOT TO SCALE', 18, 144, 'l');
      }
      function suppliesScene(t) {
        campScene(t, { seed: 5 });
        srand(15);
        const food = S ? FOODS.filter(k => S.g[k] > 0) : [];
        food.slice(0, 6).forEach((k, i) => { const x = 40 + i * 42, y = 124; R(x, y, 36, 22, 'e'); R(x, y, 36, 2, 't'); R(x + 2, y + 20, 32, 2, 't'); txt(GOOD[k].name.split(' ')[0].slice(0, 5), x + 18, y + 8, 'N', 1, true); });
      }
      function farewellScene(t) {
        sky(vga ? ['#402060', '#803050', '#d06030', '#ffa040'] : ['m', 'r', 'o', 'y'], 0, 100);
        R(200, 70, 24, 24, 'y');
        ridge(0, 88, 10, 30, 12, 'k', null, 100);
        R(0, 96, LW, 64, 'b'); for (let i = 0; i < 30; i++) R(((i * 37 + t * 0.01) % 340) - 10, 100 + (i * 11) % 56, 8, 1, i % 3 ? 'B' : 'o');
        steamer(90 - (t * 0.004) % 60, 75, t);
      }

      /* ---------- route ---------- */
      function routeList() {
        const path = (S && S.path) || 'chilkoot', bm = path === 'white' ? 1042 : 1037;
        return [{ id: 'seattle', mi: 0 }, { id: 'skagway', mi: 1000 }].concat(TRAILS[path].map(([id, mi]) => ({ id, mi })), RIVER.map(([id, r]) => ({ id, mi: bm + r })));
      }
      const routeIds = () => routeList().map(x => x.id);
      const lmMi = id => (routeList().find(x => x.id === id) || { mi: 0 }).mi;
      const nextStop = () => routeList().find(x => x.mi > S.mi + 1e-6) || null;
      const dawsonMi = () => lmMi('dawson');
      function posOnMap() {
        if (S.mi < 1000) {
          const k = clamp(S.mi / 1000, 0, 1) * (SEA_PATH.length - 1), i = Math.min(SEA_PATH.length - 2, Math.floor(k)), f = k - i;
          return [SEA_PATH[i][0] + (SEA_PATH[i + 1][0] - SEA_PATH[i][0]) * f, SEA_PATH[i][1] + (SEA_PATH[i + 1][1] - SEA_PATH[i][1]) * f];
        }
        const L = routeList();
        for (let i = 1; i < L.length; i++) if (S.mi <= L[i].mi) {
          const a = LMS[L[i - 1].id].map, b = LMS[L[i].id].map, f = (S.mi - L[i - 1].mi) / Math.max(1e-6, L[i].mi - L[i - 1].mi);
          return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        }
        return LMS.dawson.map;
      }

      /* ---------- screen loop, layout, text panel ---------- */
      const SCENES = { title: titleScene, seattle: seattleScene, store: storeScene, sea: seaScene, skagway: skagwayScene, dyea: dyeaScene, camp: campScene,
        scales: scalesScene, stairs: stairsScene, summit: summitScene, lake: lakeScene, bennett: bennettScene, saw: sawScene, river: riverScene, canyon: canyonScene,
        whitehorse: whitehorseScene, laberge: labergeScene, fivefinger: fivefingerScene, selkirk: selkirkScene, dawson: dawsonScene, winter: winterScene,
        talk: portrait, map: mapScene, supplies: suppliesScene, farewell: farewellScene, trail: trailScene,
        hunt: t => huntDraw(t), fish: t => fishDraw(t), rapids: t => rapidsDraw(t), pan: t => panDraw(t) };
      let lastTs = 0;
      function loop(ts) {
        raf = requestAnimationFrame(loop);
        if (W.el && W.el.classList.contains('min')) { lastTs = ts; return; }
        const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000); lastTs = ts;
        try {
          if (G && G.update && !G.paused && !G.done) G.update(dt);
          (SCENES[cur.name] || titleScene)(ts, cur.opt || {});
        } catch (e) { console.error(e); cancelAnimationFrame(raf); }
      }
      function setCanvas(w, h) { if (LW !== w || LH !== h) { LW = w; LH = h; cv.width = w; cv.height = h; } fit(); }
      function fit() {
        const bw = W.body.clientWidth, bh = W.body.clientHeight;
        if (!bw || !bh) return;
        const nar = bw < 560;
        root.classList.toggle('kdk-nar', nar);
        root.classList.toggle('kdk-big', big);
        const sideW = (!nar && !big && sideEl.innerHTML) ? Math.min(240, Math.max(180, bw * 0.28)) : 0;
        const maxW = bw - 18 - sideW - (sideW ? 6 : 0);
        const maxH = bh * (big ? (nar ? 0.56 : 0.66) : small ? (nar ? 0.22 : 0.3) : (nar ? 0.34 : 0.46));
        const aspect = LW / LH;
        let w = Math.min(maxW, maxH * aspect);
        const k = w / LW; if (k >= 2) w = Math.floor(k) * LW;
        cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(w / aspect) + 'px';
      }
      W.onResize = fit;

      const coarse = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
      const keyFor = i => i === 9 ? '0' : String(i + 1);
      function show(o) {
        anyKey = null; extraKey = null;
        big = !!o.big; small = !!o.small;
        const sz = o.size || [320, 160];
        setCanvas(sz[0], sz[1]);
        cur = { name: o.art || 'title', opt: o.opt || {} };
        curChoices = (o.choices || []).filter(Boolean); curCont = o.cont || null;
        let h = '';
        if (o.title) h += '<div class="kdk-h">' + o.title + '</div>';
        if (o.html) h += '<div class="kdk-p">' + o.html + '</div>';
        if (curChoices.length) {
          if (o.ask) h += '<div class="kdk-dim">' + o.ask + '</div>';
          h += '<div class="kdk-chs">' + curChoices.map((c, i) => '<button class="kdk-ch" data-i="' + i + '"' + (c.disabled ? ' disabled' : '') + '><b>' + (c.key || keyFor(i)) + '.</b> ' + c.label + '</button>').join('') + '</div>';
        }
        if (curCont) h += '<button class="kdk-ch kdk-cont" data-c="1">' + (o.contLabel || (coarse ? 'Tap here to continue' : 'Press ENTER to continue')) + '</button>';
        txtEl.innerHTML = h; txtEl.scrollTop = 0;
        status(o.side !== false);
        fit();
        if (o.after) o.after(txtEl);
      }
      txtEl.addEventListener('click', e => {
        const b = e.target.closest('[data-i],[data-c]'); if (!b || !txtEl.contains(b)) return;
        sfx('click');
        if (b.dataset.c) { const f = curCont; if (f) f(); }
        else { const c = curChoices[+b.dataset.i]; if (c && !c.disabled) c.fn(); }
      });
      W.onKey = e => {
        if (dead) return;
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (G && G.key && G.key(e, true)) { e.preventDefault(); return; }
        if (anyKey) { e.preventDefault(); anyKey(); return; }
        if (extraKey && extraKey(e)) { e.preventDefault(); return; }
        const k = e.key;
        const idx = curChoices.findIndex((c, i) => (c.key || keyFor(i)).toLowerCase() === k.toLowerCase());
        if (idx >= 0 && !curChoices[idx].disabled) { e.preventDefault(); sfx('key'); curChoices[idx].fn(); return; }
        if ((k === 'Enter' || k === ' ') && curCont) { e.preventDefault(); sfx('key'); curCont(); }
      };
      const keyUp = e => { if (G && G.key) G.key(e, false); };
      document.addEventListener('keyup', keyUp);
      cv.addEventListener('pointerdown', e => {
        if (G && G.pointer) { e.preventDefault(); G.pointer(e, 'down'); return; }
        if (anyKey) { anyKey(); return; }
        if (curCont) curCont();
      });
      cv.addEventListener('pointermove', e => { if (G && G.pointer) G.pointer(e, 'move'); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, e => { if (G && G.pointer) G.pointer(e, 'up'); }));
      const canvasXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * LW / r.width, (e.clientY - r.top) * LH / r.height]; };

      function tempWord(c) { return ['Warm', 'Cool', 'Cold', 'Very cold', 'Bitter cold'][c] || 'Cold'; }
      function status(on = true) {
        if (!S || !on || !S.wx) { sideEl.innerHTML = ''; return; }
        const nx = nextStop(), rows = [];
        rows.push(['Date', fmtShort(today())]);
        rows.push(['Weather', esc(S.wx.sky)]);
        rows.push(['Temp.', tempWord(S.wx.cold)]);
        rows.push(['Health', hpWord(avgHp())]);
        rows.push(['Food', lbs(foodLb())]);
        if (S.phase === 'stairs' && S.st) rows.push(['Loads up', S.st.up + '/' + S.st.total]);
        else if (nx) rows.push(['Next', esc(LMS[nx.id].name)], ['To next', Math.ceil(nx.mi - S.mi - 1e-6) + ' mi']);
        rows.push(['To Dawson', Math.max(0, Math.ceil(dawsonMi() - S.mi - 1e-6)) + ' mi']);
        rows.push(['Pace', PACES[S.pace].name], ['Rations', RATIONS[S.ration].name]);
        if (S.boat) rows.push(['Boat', Math.round(S.boat.hp) + '%']);
        rows.push(['Money', money(S.money)]);
        sideEl.innerHTML = '<div class="kdk-sh">' + esc(S.party[0].name) + '\'s party (' + here().length + ')</div>' + rows.map(r => '<div><span>' + r[0] + ':</span><b>' + r[1] + '</b></div>').join('');
      }

      // A list of screens shown one after another, then `after`.
      function runList(list, after) {
        const step = () => {
          save();
          if (!list.length) { if (S && !here().length) return gameOver('all'); return after(); }
          const s = list.shift();
          if (s.sound) s.sound();
          if (s.choices) { s.choices = s.choices.map(c => Object.assign({}, c, { fn: () => c.fn(step) })); show(s); }
          else show(Object.assign({}, s, { cont: step }));
        };
        step();
      }
      const stopRun = () => { running = false; clearTimeout(tickT); tickT = 0; };

      /* ---------- weather, food, health ---------- */
      function rollWeather() {
        const mo = today().getUTCMonth(), p = place();
        let cold = [3, 2.6, 2, 1.2, 0.4, 0, 0, 0, 0.4, 1.1, 2, 3][mo];
        if (p === 'trail' && !(S.atLm === 'skagway' || S.atLm === 'dyea')) cold += 0.7;
        if (p === 'water' && S.mi - S.bennettMi > 200) cold += 0.4;
        if (p === 'sea' || S.mi <= 0) cold -= 1;
        cold = clamp(Math.round(cold + rnd(-0.6, 0.6)), 0, 4);
        if (S.wx && chance(0.45) && !(S.wx.sky === 'Blizzard' && chance(0.5))) { S.wx.cold = cold; return; }
        const r = Math.random(), sn = snowGround() || cold >= 2;
        let sky;
        if (cold >= 2) sky = r < 0.42 ? 'Clear' : r < 0.72 ? 'Snow' : r < 0.9 ? 'Heavy snow' : 'Blizzard';
        else if (cold === 1) sky = r < 0.35 ? 'Clear' : r < 0.55 ? 'Cloudy' : r < 0.74 ? (sn ? 'Snow' : 'Rain') : r < 0.86 ? 'Fog' : (sn ? 'Heavy snow' : 'Heavy rain');
        else sky = r < 0.5 ? 'Clear' : r < 0.72 ? 'Cloudy' : r < 0.9 ? 'Rain' : 'Heavy rain';
        if (mo >= 7 && mo <= 9 && cold < 2 && (p === 'trail' || p === 'town') && chance(0.25)) sky = 'Rain';
        if (p === 'sea' && sky === 'Blizzard') sky = 'Heavy snow';
        S.wx = { sky, cold };
      }
      function eat(need) {
        let got = 0;
        const f = Math.min(S.g.fresh, need); S.g.fresh -= f; got += f;
        let rest = need - f;
        for (let pass = 0; pass < 4 && rest > 0.001; pass++) {
          const av = FOODS.filter(k => S.g[k] > 0.001), ss = av.reduce((a, k) => a + FOOD_SHARE[k], 0);
          if (!ss) break;
          const r0 = rest;
          av.forEach(k => { const take = Math.min(S.g[k], r0 * FOOD_SHARE[k] / ss); S.g[k] -= take; rest -= take; got += take; });
        }
        return got;
      }
      function takeFood(lb) { return eat(lb); }
      const ILLS = {
        fever: { name: 'a fever', days: [5, 8] }, grippe: { name: 'the grippe (influenza)', days: [4, 7] }, cough: { name: 'a bad cough', days: [4, 7] },
        ankle: { name: 'a sprained ankle', days: [5, 8], hurt: 1 }, arm: { name: 'a broken arm', days: [16, 22], hurt: 1 },
        frost: { name: 'frostbitten toes', days: [6, 10] }, snowblind: { name: 'snow blindness', days: [2, 4] },
        tired: { name: 'exhaustion', days: [3, 5] }, back: { name: 'a wrenched back', days: [4, 6], hurt: 1 }, scurvy: { name: 'scurvy', days: [999, 999] }
      };
      function pickIllness(ctxName, moving) {
        const n = here().length, mo = monthNow(), L = [['fever', 2], ['grippe', 2], ['cough', 2]];
        if (ctxName === 'trail' || ctxName === 'stairs') L.push(['ankle', 3], ['arm', 0.5]);
        if (ctxName === 'water' || ctxName === 'work') L.push(['back', 2]);
        if (S.wx.cold >= 3) L.push(['frost', S.g.clothes < n ? 4 : 0.8]);
        if (snowGround() && mo >= 2 && mo <= 4 && S.wx.sky === 'Clear') L.push(['snowblind', 2]);
        if (moving && S.pace > 0) L.push(['tired', 2 * S.pace]);
        let tot = L.reduce((a, x) => a + x[1], 0), r = Math.random() * tot;
        for (const [k, w] of L) { if ((r -= w) <= 0) return k; }
        return 'fever';
      }
      function sick(m, k, out) {
        const I = ILLS[k];
        m.ill = { k, days: irnd(I.days[0], I.days[1]), med: false };
        let h = nm(m) + ' has ' + I.name + '.';
        if (k === 'scurvy') h += ' Sore gums and aching joints: scurvy comes from going too long without fresh food. Dried fruit, or fresh meat or fish, will help.';
        else if (S.g.medicine >= 1) { S.g.medicine -= 1; m.ill.med = true; m.ill.days = Math.ceil(m.ill.days * 0.6); h += ' You treat it from the medicine chest.'; }
        else h += ' Your medicine chest is empty. Rest will help.';
        out.push({ art: cur.name === 'hunt' ? 'camp' : curArt(), opt: curOpt(), title: 'Trouble in camp', html: '<p>' + h + '</p>', sound: () => jingle(J_BAD) });
      }
      function turnBack(m, out) {
        m.gone = true; m.hp = 0; m.ill = null;
        const took = takeFood(Math.min(40, foodLb()));
        const you = m === S.party[0];
        out.push({ art: 'farewell', title: you ? 'You turn back' : esc(m.name) + ' turns back', sound: () => jingle([[67, 0], [64, 0.2], [62, 0.4], [60, 0.6, 0.5]], 'triangle'),
          html: '<p>' + (you ? 'You are too worn out to go on. You turn back and head home to recover. Your companions promise to carry on and write to you from Dawson City. You will follow the rest of the journey through their letters.'
            : here().length ? nm(m) + ' is too worn out to go on, and turns back to head home and recover. Before leaving, ' + esc(m.name) + ' shakes everyone\'s hand and promises to write.'
            : nm(m) + ', the last of the party, is too worn out to go on, and turns back to head home and recover.') + '</p>' +
            (took >= 1 ? '<p class="kdk-dim">' + lbs(took) + ' of food goes along for the trip home.</p>' : '') });
      }
      function dayPass(ctxName) {
        const out = [];
        S.day++;
        rollWeather();
        const P = here(), n = P.length, mo = monthNow();
        const need = RATIONS[S.ration].lb * n, ate = eat(need), starving = ate < need * 0.5;
        const dark = mo >= 10 || mo <= 1;
        let candleOk = true;
        if (dark && ctxName !== 'sea') { if (S.g.candles >= 1) S.g.candles -= 1; else candleOk = false; }
        if (S.g.fresh > 0) S.g.fresh = Math.max(0, S.g.fresh * (S.wx.cold >= 2 ? 0.99 : 0.95) - 0.2);
        if (S.g.fruit + S.g.fresh > 0.5) S.noFresh = 0; else S.noFresh++;
        const moving = ['trail', 'stairs', 'water', 'work'].includes(ctxName);
        let base = 0.35;
        if (moving) base -= PACES[S.pace].drain * (ctxName === 'water' ? 0.5 : 1);
        base += starving ? -6 : RATIONS[S.ration].hp;
        const cold = S.wx.cold;
        if (cold >= 2 && ctxName !== 'sea') {
          const cc = Math.min(1, S.g.clothes / n), bc = Math.min(1, S.g.blankets / n), sh = ((S.cabin && ctxName === 'camp') || S.g.tents > 0) ? 1 : 0;
          base -= (cold - 1) * ((1 - cc) * 1.6 + (1 - bc) * 0.8 + (1 - sh) * 1.2);
        }
        if (moving && S.wx.sky === 'Blizzard') base -= 1.2;
        if (moving && S.wx.sky === 'Heavy rain') base -= 0.6;
        if (S.g.coffee > 0.5 || S.g.sugar > 0.5) base += 0.2;
        if (!candleOk) base -= 0.4;
        if ((ctxName === 'rest' || ctxName === 'camp') && !starving) base += 2.2 + (S.bg === 1 ? 1.4 : 0);
        if (S.bg === 3 && base < 0) base *= 0.75;
        P.forEach(m => {
          let d = base + rnd(-0.4, 0.4);
          if (m.ill) {
            d -= m.ill.med ? 1.2 : 2.8;
            if (m.ill.k === 'scurvy' && S.g.fruit + S.g.fresh > 0.5) m.ill.days = Math.min(m.ill.days, 5);
            if (--m.ill.days <= 0) { out.push({ art: curArt(), opt: curOpt(), title: 'Good news', html: '<p>' + nm(m) + ' has gotten over ' + ILLS[m.ill.k].name + '.</p>', sound: () => jingle(J_GOOD) }); m.ill = null; }
          }
          m.hp = clamp(m.hp + d, 0, 100);
        });
        P.forEach(m => {
          if (m.ill || m.hp <= 0) return;
          if (S.noFresh > 20 && chance(0.025)) return sick(m, 'scurvy', out);
          let p = 0.004 + (moving ? PACES[S.pace].ill : 0) + RATIONS[S.ration].ill + (starving ? 0.03 : 0);
          if (cold >= 2 && S.g.clothes < n) p += 0.01 * (cold - 1);
          if (/Rain|Blizzard|Heavy/.test(S.wx.sky)) p += 0.004;
          if (ctxName === 'sea') p *= 0.5;
          if (chance(p)) sick(m, pickIllness(ctxName, moving), out);
        });
        P.forEach(m => { if (m.hp <= 0 && !m.gone) turnBack(m, out); });
        if (!here().length) return out;
        if (starving && !S.warnedFood) { S.warnedFood = true; out.push({ art: curArt(), opt: curOpt(), title: 'Out of food!', html: '<p>The food is gone, and everyone is getting weaker every day. Hunt, fish, trade or buy food as soon as you can.</p>', sound: () => jingle(J_BAD) }); }
        if (!starving) S.warnedFood = false;
        const pe = { sea: 0.2, trail: 0.1, stairs: 0.04, water: 0.1, camp: 0.035, rest: 0.03, work: 0.07 }[ctxName] || 0;
        if (S.cool > 0) S.cool--;
        else if (chance(pe)) { const e = randomEvent(ctxName); if (e) { out.push(e); S.cool = 2; } }
        return out;
      }
      function curArt() { return cur.name && !['hunt', 'fish', 'rapids', 'pan', 'title', 'map', 'talk', 'store'].includes(cur.name) ? cur.name : travelArt(); }
      function curOpt() { return Object.assign({}, cur.opt, { moving: false }); }
      function travelArt() { const p = S ? place() : 'town'; return p === 'sea' ? 'sea' : p === 'water' ? 'river' : p === 'trail' ? 'trail' : 'seattle'; }
      function lose(k, frac, min = 0) { const amt = Math.max(Math.min(S.g[k], min), S.g[k] * frac); S.g[k] -= amt; return amt; }
      function biggestFood() { return FOODS.slice().sort((a, b) => S.g[b] - S.g[a])[0]; }
      const FOODNAME = { flour: 'flour', bacon: 'bacon', beans: 'beans', fruit: 'dried fruit', coffee: 'coffee and tea', sugar: 'sugar' };
      const somebody = () => pick(here());
      function hurt(m, amt) { m.hp = clamp(m.hp - amt, 0, 100); }

      /* ---------- random events ---------- */
      const WHO = ['Oscar Lund', 'Maggie Doyle', 'Pierre Gagnon', 'Hank Ellery', 'Clara Voss', 'Jed Hollis', 'Birdie Marsh', 'Tom Kettle', 'Ruby Carver', 'Axel Nygaard'];
      function randomEvent(ctxName) {
        const P = here(), n = P.length, mo = monthNow(), snow = snowGround(), ev = [];
        const add = (w, fn) => ev.push([w, fn]);
        const A = travelArt(), O = { moving: false };
        const E = (title, html, extra = {}) => Object.assign({ art: A, opt: O, title, html: '<p>' + html + '</p>' }, extra);
        if (ctxName === 'sea') {
          add(3, () => { const m = somebody(); hurt(m, 8); return E('Rough water', 'The steamer rolls through the open water of Queen Charlotte Sound. Half the passengers are seasick, including ' + nm(m) + '.'); });
          add(2, () => { P.forEach(m => hurt(m, 2)); return E('Packed like sardines', 'The steamer is jammed with stampeders, dogs, horses and mountains of freight. Nobody gets much sleep.'); });
          add(2, () => { P.forEach(m => { m.hp = clamp(m.hp + 3, 0, 100); }); return E('Whales!', 'Someone shouts "Whales!" and everyone rushes to the rail to watch them spout and dive. It is the best day of the voyage.', { opt: { whales: true } }); });
          add(1.5, () => { S.lost = (S.lost || 0) + 1; return E('Fog', 'Thick fog rolls in. The captain anchors in a sheltered bay to wait for it to lift. You lose a day.'); });
          add(1.5, () => E('A friendly game?', 'A smiling stranger in a checked suit invites you to a "friendly little card game." You politely say no. Smart move: he turns out to be a card sharp.'));
        }
        if (ctxName === 'trail' || ctxName === 'stairs') {
          add(2, () => { const k = biggestFood(), amt = Math.min(S.g[k], irnd(15, 40)); S.g[k] -= amt; return E('Torn sack', 'A sack of ' + FOODNAME[k] + ' snags on a rock and splits open. You save most of it, but ' + lbs(amt) + ' is lost in the ' + (snow ? 'snow' : 'mud') + '.'); });
          add(S.atLm === 'sheep' || (S.path === 'chilkoot' && S.mi < 1015) ? 2 : 1, () => { const amt = Math.min(S.g.bacon, irnd(20, 50)); S.g.bacon -= amt; return amt > 1 ? E('Thief!', 'During the night, a sneak thief makes off with ' + lbs(amt) + ' of your bacon. From now on, somebody sleeps next to the cache.') : null; });
          add(2, () => { S.bonusMi = (S.bonusMi || 0) + 1; const w = pick(WHO); takeFood(10); return E('A helping hand', 'A stampeder named ' + w + ' helps you haul loads all day in exchange for a hot meal of beans and bacon. You move a good deal farther than usual.'); });
          add(1.5, () => { const k = pick(['flour', 'beans', 'bacon', 'fruit', 'sugar']), amt = irnd(25, 75); S.g[k] += amt; return E('An abandoned cache', 'Beside the trail you find a pile of goods left by a party that turned back. A note on top says: "Help yourself, and good luck." You take ' + lbs(amt) + ' of ' + FOODNAME[k] + '.', { sound: () => jingle(J_GOOD) }); });
          add(1.5, () => { const d = irnd(1, 2); S.lost = (S.lost || 0) + d; return E('Wrong trail', (S.wx.sky === 'Fog' ? 'In the fog you' : 'You') + ' follow a side trail that leads nowhere. It takes ' + plural(d, 'day') + ' to find your way back.'); });
          if (snow) add(mo >= 10 || mo <= 3 ? 2.5 : 1, () => { const d = irnd(1, 3); S.lost = (S.lost || 0) + d; S.wx = { sky: 'Blizzard', cold: Math.max(2, S.wx.cold) }; return E('Snowstorm', 'A howling snowstorm buries the trail. You huddle in your tents for ' + plural(d, 'day') + ' until it blows itself out.'); });
          if (!snow && mo >= 7 && mo <= 9) add(2.5, () => { S.lost = (S.lost || 0) + 1; return E('Mud', 'Heavy rain turns the trail into a river of mud. Boots, horses and sleds sink to the knees. You lose a day.'); });
          add(1.5, () => {
            const cost = n * 0.5;
            return E('A roadhouse', 'A roadhouse beside the trail is serving hot meals: beans, bacon and sourdough flapjacks, 50 cents a plate.', { choices: [
              { label: 'Buy a hot meal for everyone (' + money(cost) + ')', disabled: S.money < cost, fn: next => { S.money -= cost; here().forEach(m => { m.hp = clamp(m.hp + 6, 0, 100); }); jingle(J_GOOD); show({ art: A, title: 'Delicious', html: '<p>Everyone eats until they can\'t eat any more. Spirits are high.</p>', cont: next }); } },
              { label: 'No thanks, keep moving', fn: next => next() }] });
          });
          add(1, () => E('Say cheese', 'A photographer has set up a big wooden camera on a tripod beside the trail. He takes your party\'s picture. "Hold still! Someday people will want to see what this was like," he says.'));
          add(1, () => E('A young writer', 'A young man from California sits on a rock, scribbling in a notebook between loads. "Someday I\'m going to write stories about all this," he tells you.'));
          if (S.g.horses > 0 && !(S.path === 'chilkoot' && S.mi >= lmMi('scales'))) {
            add(1.5, () => { S.lost = (S.lost || 0) + 1; return E('Runaway horse', 'One of your pack horses wanders off in the night. You find it the next morning, calmly munching on willow leaves. You lose a day.'); });
            add(1, () => { S.g.horses--; const got = 20; S.money += got; return E('Lame horse', 'One of your horses goes lame and cannot carry a load. A freighter buys it from you for ' + money(got) + ' and promises to rest it until it heals.'); });
          }
          if (snow && S.g.sled > 0) add(1.5, () => { if (S.g.rope >= 1) { S.g.rope--; return E('Cracked runner', 'A runner on one of your sleds cracks. You lash it together with a coil of rope, and it holds.'); } S.g.sled--; return E('Broken sled', 'A sled runner snaps, and you have no rope to mend it. You leave the broken sled behind.'); });
          add(1.2, () => {
            return E('Gold rumor!', 'A breathless stampeder runs past: "Gold! They found gold on a creek just over that ridge!" Do you go and look?', { choices: [
              { label: 'Go and look (takes 2 days)', fn: next => { S.lost = (S.lost || 0) + 2; if (chance(0.15)) { const g = irnd(4, 12); S.money += g; jingle(J_GOOD); show({ art: A, title: 'Lucky!', html: '<p>The creek is already staked from end to end, but a friendly miner lets you pan a little. You wash out gold dust worth ' + money(g) + '.</p>', cont: next }); } else { jingle(J_BAD); show({ art: A, title: 'Just a rumor', html: '<p>You find a cold, empty creek and a dozen other stampeders who heard the same rumor. There is no gold here. You lose 2 days.</p>', cont: next }); } } },
              { label: 'Ignore it and keep going', fn: next => { show({ art: A, title: 'Probably wise', html: '<p>Rumors fly up and down the trail every day. You stick to the plan.</p>', cont: next }); } }] });
          });
          if (!snow && mo >= 5 && mo <= 7) add(2, () => { P.forEach(m => hurt(m, 3)); return E('Mosquitoes', 'Clouds of mosquitoes swarm around your heads all day. Everyone is itchy, cranky and miserable.'); });
          add(1, () => { S.lost = (S.lost || 0) + 1; return E('Moose on the trail', 'A big bull moose is standing in the middle of the trail, and he is in no hurry to leave. You wait most of the day for him to wander off.'); });
          if (mo >= 10 || mo <= 2) add(1.2, () => { P.forEach(m => { m.hp = clamp(m.hp + 3, 0, 100); }); return E('Northern lights', 'That night the northern lights ripple green and pink across the sky. Nobody can stop staring. For a while, everyone forgets how tired they are.'); });
          add(0.8, () => E('Mail carrier', 'A mail carrier with a dog team passes, heading for the coast. He offers to carry letters home. Everyone scribbles a quick note to family.'));
        }
        if (ctxName === 'water') {
          const lake = onLake();
          add(2.5, () => { const nails = S.g.nails >= 0.25; S.boat.hp = Math.max(5, S.boat.hp - (nails ? 4 : 12)); if (nails) S.g.nails -= 0.25; else S.lost = (S.lost || 0) + 1; return E('Leak!', 'Your boat springs a leak and water sloshes around everyone\'s boots. ' + (nails ? 'You pull ashore and patch it with pitch and a few nails.' : 'With no nails or pitch left, you stuff the seams with rags and spend a day drying out.')); });
          add(1.5, () => { S.lost = (S.lost || 0) + 1; return E('Aground', 'The boat runs up on a gravel bar. Everyone climbs out into the icy water to push. You lose most of the day.'); });
          if (lake) add(2.5, () => { S.lost = (S.lost || 0) + 1; return E('Wind on the lake', 'A strong wind whips the lake into whitecaps. It is too rough to go on, so you pull ashore and wait for the wind to drop.'); });
          if (lake) add(2, () => { S.bonusMi = (S.bonusMi || 0) + 15; return E('A fair wind', 'A fair wind blows down the lake! You rig a blanket as a sail and fly along with hardly any rowing.', { sound: () => jingle(J_GOOD) }); });
          add(1.5, () => { const k = biggestFood(), amt = Math.min(S.g[k], irnd(20, 60)); S.g[k] -= amt; return E('Swamped goods', 'A wave slops over the side and soaks ' + lbs(amt) + ' of ' + FOODNAME[k] + '. It is ruined.'); });
          add(1, () => E('On the shore', 'A black bear watches you from the shore, then ambles off into the trees. Nobody complains when you row a little faster.'));
          add(1.2, () => E('Stuck on a gravel bar', 'A boat is stuck on a gravel bar and its crew is waving for help.', { choices: [
            { label: 'Stop and help (lose a day)', fn: next => { S.lost = (S.lost || 0) + 1; const g = irnd(5, 15); S.money += g; here().forEach(m => { m.hp = clamp(m.hp + 2, 0, 100); }); show({ art: A, title: 'Thank you!', html: '<p>Together you push their boat free. They insist on paying you ' + money(g) + ' for your trouble, and everyone feels good about it.</p>', cont: next }); } },
            { label: 'Keep going: someone else will stop', fn: next => next() }] }));
          if (mo >= 5 && mo <= 7) add(1.5, () => { P.forEach(m => hurt(m, 3)); return E('Mosquitoes', 'On the river the mosquitoes are so thick that you have to wave them away from your mouth to eat.'); });
          add(0.8, () => E('The river road', 'Hundreds of boats are strung out along the river: scows, skiffs, rafts and one boat shaped suspiciously like a bathtub. Everyone waves.'));
        }
        if (ctxName === 'camp' || ctxName === 'rest') {
          add(2, () => { P.forEach(m => { m.hp = clamp(m.hp + 3, 0, 100); }); return E('Northern lights', 'The northern lights dance over camp all night long. It is one of the most beautiful things any of you have ever seen.'); });
          add(0.8, () => { P.forEach(m => hurt(m, 3)); return E('Cabin fever', 'Day after day of the same four walls and the same four faces. Tempers are short. Somebody hides somebody else\'s left boot.'); });
          add(1.2, () => { const amt = irnd(20, 40); S.g.fresh += amt; return E('Visitors', 'A friendly sourdough (an old-timer who has lived through a Yukon winter) stops by and shares ' + lbs(amt) + ' of fresh meat, plus advice: "Keep busy, keep warm, and eat your dried fruit."', { sound: () => jingle(J_GOOD) }); });
          if (S.wx.cold >= 3) add(1.5, () => { P.forEach(m => { if (S.g.clothes < n) hurt(m, 6); }); return E('Cold snap', 'The temperature drops so low that the mercury in your thermometer freezes solid.' + (S.g.clothes < n ? ' Without enough warm clothing, everyone suffers.' : ' Luckily everyone has warm clothing.')); });
        }
        if (ctxName === 'work') {
          add(2, () => { if (n < 2) return null; const [a, b] = P.slice().sort(() => Math.random() - 0.5); const c = Math.min(S.g.coffee, 5); S.g.coffee -= c; return E('Whipsaw quarrel', nm(a) + ' and ' + nm(b) + ' argue over the whipsaw. "You\'re not pulling!" "Well, YOU\'RE not pushing!" ' + (c > 0 ? 'A pot of coffee settles it.' : 'Eventually they laugh about it.')); });
          add(1.5, () => { if (S.build) S.build.done += 2; return E('A helping hand', 'A neighbor who finished his own boat spends two days helping you saw planks.', { sound: () => jingle(J_GOOD) }); });
          add(1.2, () => { if (S.build) S.build.done = Math.max(0, S.build.done - 1); return E('Crooked plank', 'A plank splits along a knot, and a day\'s sawing goes into the campfire.'); });
        }
        if (!ev.length) return null;
        let tot = ev.reduce((a, x) => a + x[0], 0), r = Math.random() * tot;
        for (const [w, fn] of ev) if ((r -= w) <= 0) return fn();
        return null;
      }

      function horsesAllowed() { return S.g.horses > 0 && !S.launched && !(S.path === 'chilkoot' && S.mi >= lmMi('scales')); }
      function trailScene(t, o) {
        const snow = snowGround(), mud = S && !snow && monthNow() >= 7 && monthNow() <= 9;
        const moving = o.moving && S && !(S.lost > 0) && S.wx.sky !== 'Blizzard';
        const off = (S ? S.mi * 40 : 0) + (moving ? t * 0.012 : 0);
        sky(skyCols(), 0, 90);
        ridge(off * 0.08, 40, 28, 26, 10, 'A', 'w', 100);
        ridge(off * 0.25, 74, 12, 17, 6, snow ? 's' : 'D', snow ? 'w' : null, 104);
        R(0, 100, LW, 60, snow ? 'w' : 'g');
        R(0, 120, LW, 16, snow ? 's' : mud ? 'N' : 'n');
        if (mud) for (let i = 0; i < 16; i++) R(((i * 43 - off) % 340 + 340) % 340 - 10, 124 + (i * 5) % 10, 8, 1, 'n');
        for (let i = 0; i < 12; i++) { const x = ((i * 47 - off * 0.6) % 520 + 520) % 520 - 40; spruce(x, 106 + (i % 3) * 2, 10 + (i % 4) * 3, 'D', snow); }
        for (let i = 0; i < 6; i++) { const x = ((i * 90 + 30 - off * 0.6) % 540 + 540) % 540 - 60; tiny(x, 112, i % 2 ? 'k' : 'N', t, i); }
        if (S) {
          const shirts = ['r', 'b', 'g', 'm', 'c'], P = S.party;
          let x = 210;
          if (horsesAllowed()) for (let h = 0; h < Math.min(3, S.g.horses); h++) { horse(x + 20 - h * 4, 122 + h * 3, t, moving); x -= 4; }
          let sleds = snow ? S.g.sled : 0;
          P.forEach((m, i) => {
            if (m.gone) return;
            walker(x, 116 + (i % 2) * 4, shirts[i], t, moving, { ph: i, pack: !sleds });
            if (sleds > 0) { sled(x - 24, 126 + (i % 2) * 4); R(x - 4, 124 + (i % 2) * 4, 5, 1, 'N'); sleds--; x -= 26; }
            x -= 22;
          });
        }
        for (let i = 0; i < 6; i++) { const x = ((i * 71 - off * 1.5) % 480 + 480) % 480 - 40; spruce(x, 162, 18 + (i % 3) * 4, snow ? 'D' : 'k', snow); }
        weatherFx(t);
      }

      /* ---------- travel ---------- */
      function partyCap() {
        const snow = snowGround();
        let sleds = snow ? S.g.sled : 0, cap = 0;
        here().forEach(m => { const f = (m.ill ? (ILLS[m.ill.k].hurt ? 0.3 : 0.5) : 1) * (m.hp < 30 ? 0.7 : 1); cap += (sleds-- > 0 ? 110 : 60) * f; });
        if (horsesAllowed()) cap += S.g.horses * 150;
        return Math.max(20, cap);
      }
      function healthF() { const h = avgHp(); return h >= 50 ? 1 : 0.6 + h / 125; }
      function trailSpeed() {
        if (S.wx.sky === 'Blizzard') return 0;
        const snow = snowGround(), mo = monthNow();
        let D = PACES[S.pace].walk * healthF();
        if (!snow && mo >= 7 && mo <= 9) D *= S.path === 'white' ? 0.55 : 0.85;
        if (S.wx.sky === 'Heavy snow') D *= 0.6; else if (S.wx.sky === 'Heavy rain') D *= 0.75;
        const hired = S.hired && S.hired.lb ? S.hired.lb : 0;
        const Wt = Math.max(0, weight() - hired);
        return Math.min(D, D / Math.max(1, (Wt / partyCap()) * 0.5));
      }
      function waterSpeed() {
        const lake = onLake();
        let v = (lake ? 18 : 34) * PACES[S.pace].row * healthF() * (S.boat && S.boat.hp < 35 ? 0.8 : 1);
        if (lake && /Blizzard|Heavy/.test(S.wx.sky)) v *= 0.4;
        return v;
      }
      const tickMs = () => dev.fast ? 6 : [650, 380, 170][opt.speed];
      function travelLine() {
        const p = place(), nx = nextStop();
        if (!nx) return '';
        const to = '<b>' + esc(LMS[nx.id].name) + '</b>';
        if (S.lost > 0) return 'Held up: ' + plural(S.lost, 'more day') + ' before you can move on.';
        if (p === 'sea') return 'Steaming north through the Inside Passage toward ' + to + '.';
        if (p === 'water') return (onLake() ? 'Rowing down the lake' : 'Floating down the river') + ' toward ' + to + ': about ' + Math.round(S.lastMi || waterSpeed()) + ' miles a day.';
        if (S.wx.sky === 'Blizzard') return 'Blizzard! Nobody can move on the trail today.';
        const sp = S.lastMi != null ? S.lastMi : trailSpeed();
        return 'Relaying your ' + lbs(weight()) + ' outfit toward ' + to + ', one load at a time: about ' + (Math.round(sp * 10) / 10) + ' miles a day.' + (S.hired && S.hired.lb ? ' Packers are carrying ' + lbs(S.hired.lb) + ' for you.' : '');
      }
      function travel() {
        stopRun();
        S.phase = 'travel'; S.atLm = null; S.cabin = false;
        running = true;
        music(place() === 'water' ? 'river' : place() === 'sea' ? 'title' : 'trail');
        const art = travelArt();
        show({ art, opt: { moving: true, others: art === 'river' && monthNow() >= 4 && monthNow() <= 6 }, title: place() === 'sea' ? 'At sea' : place() === 'water' ? 'On the water' : 'On the trail',
          html: '<p class="kdk-tl">' + travelLine() + '</p>', cont: () => { stopRun(); campMenu(); }, contLabel: coarse ? 'Tap here to stop and look around' : 'Press SPACE to stop and look around' });
        tickT = setTimeout(tick, tickMs());
      }
      function tick() {
        tickT = 0;
        if (!running || dead || !S) return;
        const p = place(), ctxName = p === 'sea' ? 'sea' : p === 'water' ? 'water' : 'trail';
        const msgs = dayPass(ctxName);
        if (!here().length) { stopRun(); return runList(msgs, () => gameOver('all')); }
        if (p === 'water') {
          if (frozen()) { stopRun(); return runList(msgs, freezeUp); }
          if (!S.slush && frozen(today(), -8)) { S.slush = true; msgs.push({ art: 'river', title: 'Slush ice!', html: '<p>Chunks of slushy ice are running in the river, and the mornings are bitter. Freeze-up is coming soon. Push hard, or look for a good spot to make a winter camp.</p>', sound: () => jingle(J_BAD) }); }
        }
        let mi = 0;
        if (S.lost > 0) S.lost--;
        else mi = p === 'sea' ? 125 : p === 'water' ? waterSpeed() : trailSpeed();
        if (S.bonusMi) { mi += p === 'water' ? S.bonusMi : trailSpeed() * S.bonusMi; S.bonusMi = 0; }
        S.lastMi = mi;
        const nx = nextStop();
        S.mi = Math.min(nx.mi, S.mi + mi);
        const tl = txtEl.querySelector('.kdk-tl'); if (tl) tl.innerHTML = travelLine();
        status();
        save();
        if (S.mi >= nx.mi - 1e-6) { stopRun(); return runList(msgs, () => arrive(nx.id)); }
        if (msgs.length) { stopRun(); return runList(msgs, travel); }
        tickT = setTimeout(tick, tickMs());
      }

      /* ---------- arriving at places ---------- */
      function arrive(id) {
        stopRun();
        const lm = LMS[id];
        S.atLm = id; S.mi = lmMi(id); S.lastMi = null;
        if (!S.seen.includes(id)) S.seen.push(id);
        if (S.hired && S.hired.to === id) S.hired = null;
        if (lm.rapids) S.pending = id;
        save();
        jingle(J_ARRIVE);
        if (id === 'dawson') return finish();
        const msgs = [];
        msgs.push({ art: lm.scene, opt: { seed: id.length, boat: true }, title: esc(lm.full || lm.name), html: '<p>' + fmtDate(today()) + '. ' + arriveLine(id) + '</p>' });
        if (id === 'scales' && S.g.horses > 0) msgs.push(sellHorses('The last pitch of the Chilkoot is far too steep for horses. A packer buys your horses to use on the lower trail'));
        if (id === 'bennett' && S.g.horses > 0) msgs.push(sellHorses('You won\'t need horses on the river. A freighter heading back to Skagway buys them'));
        runList(msgs, () => { if (lm.border && !S.borderOk) return border(); campMenu(); });
      }
      function sellHorses(why) {
        const each = Math.round(GOOD.horses.price * 0.6), n = S.g.horses;
        S.money += each * n; S.g.horses = 0;
        return { art: 'camp', opt: { seed: 7 }, title: 'Selling the horses', html: '<p>' + why + ' for ' + money(each) + ' each. You get ' + money(each * n) + '.</p>' };
      }
      function arriveLine(id) {
        const L = {
          skagway: 'The steamer ties up at the crowded wharf. The mountains rise straight up behind a town of tents, mud and brand-new wooden buildings. Here you must choose your trail over the mountains.',
          dyea: 'Your goods are landed on the tidal flats and piled on the beach. The Chilkoot Trail begins here, 33 miles from Lake Bennett.',
          canyon: 'A tent town where the trail squeezes into a narrow canyon.',
          sheep: 'The last big camp below the pass. Above you, a long dark line of people inches up toward the sky.',
          scales: 'Straight ahead is the final climb to the summit. Your goods are piled at the bottom, waiting to be carried up.',
          chsummit: 'You made it to the top of the Chilkoot Pass! A flag snaps in the wind beside the police post.',
          lindeman: 'A long, narrow lake surrounded by tents and half-built boats.',
          wpcity: 'A tent town on the White Pass trail, full of horses, freighters and noise.',
          wpsummit: 'You made it to the top of the White Pass! A police post stands beside the trail.',
          logcabin: 'A small camp on the Canadian side of the pass. The trail runs downhill from here.',
          bennett: 'A huge tent city stretches along the shore. Everywhere you hear the sound of saws and hammers as people build their boats.',
          tagish: 'A Mountie waves you ashore at the police post.',
          marsh: 'The river opens into a wide, shallow lake.',
          miles: 'The river rushes into a narrow gorge between high walls of dark rock. Boats are pulled up on the bank while their crews decide what to do.',
          whitehorse: 'Just below the canyon, the river boils into foaming rapids.',
          laberge: 'A long, cold lake stretches ahead of you.',
          fivefinger: 'Ahead, four rock islands split the river into five channels.',
          selkirk: 'Log buildings stand above the riverbank where the Pelly River flows in.'
        };
        return L[id] || '';
      }

      /* ---------- the camp menu ---------- */
      function continueLabel() {
        const id = S.atLm;
        if (id === 'skagway' && !S.path) return 'Choose your trail over the mountains';
        if (id === 'scales') return 'Climb the Golden Stairs';
        if (id === 'bennett' && !S.boat) return 'Build or buy a boat';
        if (id === 'bennett' && !S.launched) return frozen() ? 'Wait for the ice to go out' : 'Push off down the lake';
        if (id && LMS[id].rapids && S.pending === id) return 'Decide how to get past ' + LMS[id].name;
        return S.launched ? 'Continue down the river' : place() === 'sea' ? 'Continue the voyage' : 'Continue on the trail';
      }
      function campMenu() {
        stopRun();
        if (S.phase === 'winter') return winterCamp();
        const id = S.atLm, lm = id ? LMS[id] : null;
        S.phase = 'travel'; save();
        music(lm ? null : (place() === 'water' ? 'river' : 'trail'));
        const ch = [{ label: continueLabel(), fn: goOn }];
        if (lm) ch.push({ label: 'Read about ' + lm.name, fn: () => readNote(id, campMenu) });
        if (lm && TALK[id]) ch.push({ label: 'Talk to people', fn: () => talk(campMenu) });
        ch.push({ label: 'Check supplies and party', fn: () => supplies(campMenu) });
        ch.push({ label: 'Look at the map', fn: () => showMap(campMenu) });
        ch.push({ label: 'Change pace or rations', fn: () => paceMenu(campMenu) });
        ch.push({ label: 'Stop to rest', fn: () => restMenu(campMenu) });
        if (canHunt() || canFish()) ch.push({ label: 'Go hunting or fishing', fn: () => forageMenu(campMenu) });
        if (lm && lm.trade) ch.push({ label: 'Trade with other stampeders', fn: () => trade(campMenu) });
        if (lm && lm.store) ch.push({ label: 'Buy supplies', fn: () => storeScreen({ mult: lm.store, name: storeName(id), after: campMenu }) });
        if (lm && lm.packers && (!lm.packers.only || lm.packers.only === S.path) && !(id === 'skagway' && !S.path) && !(S.hired && S.hired.lb)) ch.push({ label: 'Hire ' + lm.packers.who, fn: () => hirePackers(campMenu) });
        const art = lm ? lm.scene : travelArt();
        show({ art, opt: { seed: id ? id.length : 4, boat: true }, title: lm ? esc(lm.full || lm.name) : (place() === 'water' ? 'On the river' : place() === 'sea' ? 'At sea' : 'On the trail'),
          html: '<p>' + fmtDate(today()) + (lm ? '' : '. ' + Math.round(S.mi - (routeList().filter(x => x.mi <= S.mi).pop() || { mi: 0 }).mi) + ' miles past ' + esc(LMS[(routeList().filter(x => x.mi <= S.mi).pop() || { id: 'seattle' }).id].name)) + '.</p>', ask: 'What will you do?', choices: ch });
      }
      function storeName(id) { return { skagway: 'Skagway Mercantile', dyea: 'Dyea Trading Post', sheep: 'Sheep Camp Supply Tent', wpcity: 'White Pass Provisions', bennett: 'Bennett Lake Supply', selkirk: 'Fort Selkirk Trading Post' }[id] || 'General Store'; }
      function goOn() {
        const id = S.atLm;
        if (id === 'skagway' && !S.path) return routeChoice();
        if (id === 'scales') return stairs();
        if (id === 'bennett' && !S.boat) return boatMenu();
        if (id === 'bennett' && !S.launched) {
          if (frozen()) return winterCamp('bennett');
          S.launched = true; S.pace = Math.min(S.pace, 2);
          jingle(J_GOOD);
          return show({ art: 'bennett', title: 'Push off!', html: '<p>You load your outfit into the boat, and everyone climbs aboard. With a cheer from the shore, you push off down Lake Bennett. Dawson City is about 550 miles downstream.</p>', cont: travel });
        }
        if (id && LMS[id].rapids && S.pending === id) return rapidsChoice(id);
        travel();
      }
      function readNote(id, back) {
        show({ art: LMS[id].scene, opt: { seed: id.length }, title: 'About ' + esc(LMS[id].name), html: '<p>' + LMS[id].note + '</p>', cont: back });
      }
      function talk(back) {
        const lines = TALK[S.atLm]; if (!lines) return back();
        S.talkN = S.talkN || {}; const i = (S.talkN[S.atLm] || 0) % lines.length; S.talkN[S.atLm] = i + 1;
        const [who, line] = lines[i];
        sfx('blip');
        show({ art: 'talk', opt: { who }, html: '<p>' + line + '</p>', choices: [{ label: 'Talk to someone else', fn: () => talk(back) }, { label: 'That\'s enough talking', fn: back }] });
      }
      function supplies(back) {
        const n = here().length;
        const rows = GOODS.filter(g => S.g[g.k] > 0.5 || g.food).map(g => {
          const v = S.g[g.k];
          const amt = g.food ? lbs(v) : g.k === 'ammo' ? plural(Math.floor(v), 'cartridge') : g.k === 'medicine' ? plural(Math.floor(v), 'treatment') : g.k === 'candles' ? plural(Math.floor(v), 'candle') : Math.floor(v) + '';
          return '<tr><td>' + g.name + '</td><td class="kdk-n">' + amt + '</td></tr>';
        });
        if (S.g.fresh >= 1) rows.push('<tr><td>Fresh meat and fish</td><td class="kdk-n">' + lbs(S.g.fresh) + '</td></tr>');
        const party = S.party.map(m => '<tr><td>' + esc(m.name) + (m === S.party[0] ? ' (you)' : '') + '</td><td class="kdk-n">' + (m.gone ? '<span class="kdk-dim">went home</span>' : '<span class="' + hpCls(m.hp) + '">' + hpWord(m.hp) + '</span>' + (m.ill ? ', ' + ILLS[m.ill.k].name : '')) + '</td></tr>').join('');
        const perDay = RATIONS[S.ration].lb * n, days = perDay ? Math.floor(foodLb() / perDay) : 0;
        show({ art: 'supplies', title: 'Supplies and party', html: '<table class="kdk-tb">' + party + '</table><table class="kdk-tb">' + rows.join('') + '</table>' +
          '<p>Food: ' + lbs(foodLb()) + ', about ' + plural(days, 'day') + ' at ' + RATIONS[S.ration].name.toLowerCase() + ' rations. Outfit weight: ' + lbs(weight()) + (S.boat ? '. Boat: ' + Math.round(S.boat.hp) + '% sound' : '') + '. Money: ' + money(S.money) + '.</p>' +
          (S.borderOk ? '' : '<p class="kdk-dim">The Mounties at the summit want to see ' + lbs(BORDER_LB * n) + ' of food (' + lbs(BORDER_LB) + ' per person).</p>'), cont: back });
      }
      function showMap(back) {
        const seen = routeList().map(x => '<tr><td>' + (S.seen.includes(x.id) ? '<span class="kdk-r">*</span> ' : '&nbsp; ') + esc(LMS[x.id].name) + '</td><td class="kdk-n">' + (x.mi <= 1000 ? (x.mi ? '1,000 mi by sea' : 'start') : Math.max(0, Math.round(x.mi - S.mi)) ? Math.round(x.mi - S.mi) + ' mi ahead' : 'passed') + '</td></tr>');
        show({ art: 'map', big: true, side: false, title: 'Map of the journey', html: '<table class="kdk-tb">' + seen.join('') + '</table>', cont: back });
      }
      function paceMenu(back) {
        const ch = PACES.map((p, i) => ({ label: 'Pace: ' + p.name + (S.pace === i ? ' <span class="kdk-g">(now)</span>' : ''), fn: () => { S.pace = i; save(); paceMenu(back); } }))
          .concat(RATIONS.map((r, i) => ({ label: 'Rations: ' + r.name + ' (' + r.lb + ' lb a day each)' + (S.ration === i ? ' <span class="kdk-g">(now)</span>' : ''), fn: () => { S.ration = i; save(); paceMenu(back); } })));
        ch.push({ label: 'Done', fn: back });
        show({ art: curArt(), opt: curOpt(), title: 'Pace and rations', html: '<p>A faster pace covers more ground (or climbs more loads a day) but wears everyone down. Smaller rations make your food last longer, but a hungry party gets sick more often.</p>', choices: ch });
      }
      function restMenu(back) {
        show({ art: curArt(), opt: curOpt(), title: 'Rest', html: '<p>Resting helps sick and tired people get better, but every day costs food and time.</p>', ask: 'How long will you rest?',
          choices: [1, 3, 7].map(d => ({ label: 'Rest ' + plural(d, 'day'), fn: () => restDays(d, back) })).concat([{ label: 'Never mind', fn: back }]) });
      }
      function restDays(d, back) {
        const art = curArt(), op = curOpt();
        show({ art, opt: op, title: 'Resting', html: '<p class="kdk-tl">Resting...</p>' });
        let left = d;
        const step = () => {
          if (dead || !S) return;
          const msgs = dayPass('rest'); left--;
          const tl = txtEl.querySelector('.kdk-tl'); if (tl) tl.textContent = 'Resting: ' + fmtDate(today());
          status(); save();
          if (!here().length) return runList(msgs, () => gameOver('all'));
          if (msgs.length || left <= 0) return runList(msgs, back);
          tickT = setTimeout(step, ms(300));
        };
        tickT = setTimeout(step, ms(300));
      }

      /* ---------- trading ---------- */
      const VALUE = { flour: 0.03, bacon: 0.12, beans: 0.04, fruit: 0.1, coffee: 0.3, sugar: 0.06, clothes: 15, blankets: 6, tents: 12, tools: 18, rope: 3, nails: 5, rifle: 15, ammo: 0.075, fishing: 3, medicine: 1.7, candles: 0.05, sled: 12 };
      function tradeOffer() {
        const n = here().length;
        const spare = { tents: S.g.tents - 1, clothes: S.g.clothes - n, blankets: S.g.blankets - n, tools: S.g.tools - 1, rope: S.g.rope - 2, nails: S.g.nails - (S.boat ? 0 : 2), rifle: S.g.rifle - 1, sled: S.g.sled - (S.launched ? 0 : 2), ammo: S.g.ammo - 40, candles: S.g.candles - 40, medicine: S.g.medicine - 6, fishing: S.g.fishing - 1 };
        FOODS.forEach(k => { spare[k] = S.g[k] - 50; });
        const want = [];
        if (!S.boat && S.g.nails < 2) want.push(['nails', 1]);
        if (!S.boat && S.g.tools < 1) want.push(['tools', 1]);
        if (S.g.clothes < n) want.push(['clothes', 1]);
        if (S.g.blankets < n) want.push(['blankets', 1]);
        if (S.g.medicine < 3) want.push(['medicine', 6]);
        if (S.g.rifle > 0 && S.g.ammo < 20) want.push(['ammo', 20]);
        if (S.g.fishing < 1) want.push(['fishing', 1]);
        want.push(['fruit', 50], ['flour', 100], ['bacon', 50], ['beans', 75], ['coffee', 20], ['sugar', 50]);
        for (let tries = 0; tries < 30; tries++) {
          const [gk, gamt] = pick(want);
          const gives = Object.keys(spare).filter(k => k !== gk && spare[k] >= (GOOD[k].food ? 25 : 1));
          if (!gives.length) return null;
          const k = pick(gives), val = gamt * VALUE[gk] * rnd(1.1, 1.5);
          let amt = val / VALUE[k];
          amt = GOOD[k].food ? Math.max(25, Math.round(amt / 5) * 5) : k === 'ammo' ? Math.max(20, Math.round(amt / 10) * 10) : k === 'candles' ? Math.max(10, Math.round(amt / 10) * 10) : k === 'medicine' ? Math.max(1, Math.round(amt)) : Math.max(1, Math.round(amt));
          if (amt <= spare[k]) return { give: k, gamt: amt, get: gk, amt: gamt };
        }
        return null;
      }
      const GEARNAME = { clothes: ['warm outfit', 'warm outfits'], blankets: ['pair of blankets', 'pairs of blankets'], tents: ['tent', 'tents'], tools: ['set of carpenter\'s tools', 'sets of carpenter\'s tools'], rope: ['coil of rope', 'coils of rope'], nails: ['keg of nails and pitch', 'kegs of nails and pitch'], rifle: ['rifle', 'rifles'], fishing: ['fishing kit', 'fishing kits'], sled: ['hand sled', 'hand sleds'] };
      const amtStr = (k, a) => GOOD[k].food ? lbs(a) + ' of ' + FOODNAME[k] : k === 'ammo' ? plural(a, 'cartridge') : k === 'medicine' ? plural(a, 'treatment') + ' of medicine' : k === 'candles' ? plural(a, 'candle') : a + ' ' + GEARNAME[k][a === 1 ? 0 : 1];
      function trade(back, tries = 0) {
        const o = tradeOffer();
        if (!o) return show({ art: curArt(), opt: curOpt(), title: 'Trading', html: '<p>Nobody wants to trade for anything you can spare right now.</p>', cont: back });
        const w = pick(WHO);
        show({ art: 'talk', opt: { who: pick(['old', 'trader', 'lady', 'kid']) }, title: 'A trade offer', html: '<p>' + w + ' offers you <span class="kdk-g">' + amtStr(o.get, o.amt) + '</span> in exchange for <span class="kdk-r">' + amtStr(o.give, o.gamt) + '</span>.</p>',
          choices: [{ label: 'Accept the trade', fn: () => { S.g[o.give] -= o.gamt; S.g[o.get] += o.amt; save(); sfx('ding'); show({ art: curArt(), opt: curOpt(), title: 'It\'s a deal', html: '<p>You shake hands on it.</p>', cont: back }); } },
            { label: 'Ask someone else', disabled: tries >= 2, fn: () => trade(back, tries + 1) }, { label: 'No thanks', fn: back }] });
      }

      /* ---------- packers ---------- */
      function hirePackers(back) {
        const lm = LMS[S.atLm], P = lm.packers, rate = P.rate * S.priceMult / 100, total = P.stairs && S.st ? (S.st.total - S.st.up) * 60 : weight();
        const opts = [500, 1000, 2000, 4000].filter(x => x < total).concat([Math.ceil(total / 50) * 50]);
        const dest = LMS[P.to].name;
        const about = P.who === 'Tlingit packers'
          ? '<p>Tlingit packers know this trail better than anyone. Their people used it for trade long before the gold rush, and they are strong, skilled professionals who can carry heavy loads up the pass. They charge by the pound.</p>'
          : '<p>Freighters with strings of pack horses will carry goods up the White Pass trail, charging by the pound.</p>';
        show({ art: 'talk', opt: { who: P.who === 'Tlingit packers' ? 'packer' : 'agent' }, title: 'Hire ' + P.who, html: about + '<p>Rate: <b>' + money(rate * 100) + ' per 100 lb</b> to ' + esc(dest) + '. You have ' + money(S.money) + '.</p>', ask: 'How much will you have them carry?',
          choices: opts.map(lb => ({ label: lbs(lb) + ' for ' + money(lb * rate), disabled: lb * rate > S.money, fn: () => {
            S.money -= lb * rate;
            if (P.stairs && S.st) { S.st.total = Math.max(S.st.up, S.st.total - Math.floor(lb / 60)); }
            else S.hired = { lb, to: P.to };
            save(); sfx('ding');
            show({ art: 'talk', opt: { who: P.who === 'Tlingit packers' ? 'packer' : 'agent' }, title: 'Hired', html: '<p>The packers will carry ' + lbs(lb) + ' of your outfit to ' + esc(dest) + '.</p>', cont: () => { if (P.stairs && S.st && S.st.up >= S.st.total) return stairsDone(); back(); } });
          } })).concat([{ label: 'Never mind', fn: back }]) });
      }

      /* ---------- Skagway: choose a trail ---------- */
      function routeChoice() {
        const n = here().length, fare = 2 * n;
        show({ art: 'skagway', title: 'Which trail?', html: '<p><b>The Chilkoot Trail</b> starts at Dyea, a short boat ride away (' + money(fare) + ' for the party). It is shorter, but the final climb up the Golden Stairs is so steep that horses cannot make it: every pound must be carried up on someone\'s back.</p><p><b>The White Pass Trail</b> starts right here in Skagway. It is lower and pack horses can use it, but it is longer, and in the rainy fall it turns to deep mud.</p>',
          choices: [{ label: 'Take the Chilkoot Trail from Dyea', disabled: S.money < fare, fn: () => { S.money -= fare; S.path = 'chilkoot'; S.bennettMi = 1037; S.day++; rollWeather(); arrive('dyea'); } },
            { label: 'Take the White Pass Trail from Skagway', fn: () => { S.path = 'white'; S.bennettMi = 1042; save(); campMenu(); } },
            { label: 'Not yet', fn: campMenu }] });
      }

      /* ---------- The Golden Stairs ---------- */
      const avalancheSeason = () => { const m = monthNow(); return m >= 10 || m <= 3; };
      function stairsLoadsPerDay() { return Math.max(1, Math.round(here().reduce((a, m) => a + PACES[S.pace].loads * (m.ill ? (ILLS[m.ill.k].hurt ? 0 : 0.5) : 1) * (m.hp < 25 ? 0.5 : 1), 0))); }
      function stairs(auto) {
        stopRun();
        S.phase = 'stairs'; S.atLm = 'scales';
        if (!S.st) {
          const hired = S.hired && S.hired.to === 'chsummit' ? S.hired.lb : 0;
          S.st = { total: Math.max(1, Math.ceil(Math.max(0, weight() - hired) / 60)), up: 0 };
          S.hired = null;
          if (S.st.total <= 0) S.st.total = 1;
        }
        save(); music('trail');
        const bliz = S.wx.sky === 'Blizzard', danger = S.wx.sky === 'Heavy snow' && avalancheSeason(), per = stairsLoadsPerDay();
        if (auto && !bliz && !danger) return climbDay(true);
        let h = '<p>' + fmtDate(today()) + '. Your outfit is split into <b>' + S.st.total + ' loads</b> of about 60 lb. <b>' + S.st.up + '</b> ' + (S.st.up === 1 ? 'is' : 'are') + ' at the top. At your pace the party can carry about ' + plural(per, 'load') + ' up each day.</p>';
        if (bliz) h += '<p class="kdk-r">Blizzard! The line on the stairs has stopped. Nobody climbs in weather like this.</p>';
        else if (danger) h += '<p class="kdk-r">Heavy snow is piling up on the slopes. Avalanche danger is high today.</p>';
        else h += '<p>Weather: ' + esc(S.wx.sky) + ', ' + tempWord(S.wx.cold).toLowerCase() + '.</p>';
        const ch = [
          { label: 'Climb today', disabled: bliz, fn: () => climbDay(false) },
          { label: 'Keep climbing every day until done (stops for bad weather)', disabled: bliz, fn: () => climbDay(true) },
          { label: 'Rest in camp today', fn: () => restDays(1, stairs) },
          { label: 'Hire Tlingit packers to carry loads up', disabled: S.st.up >= S.st.total, fn: () => hirePackers(stairs) },
          { label: 'Check supplies and party', fn: () => supplies(stairs) },
          { label: 'Change pace or rations', fn: () => paceMenu(stairs) },
          { label: 'Read about the Golden Stairs', fn: () => show({ art: 'stairs', opt: { up: S.st.up, total: S.st.total, n: here().length }, title: 'The Golden Stairs', html: '<p>In winter, stampeders chopped hundreds of steps into the snow and ice of the last steep slope below the Chilkoot summit. They climbed in one long, slow line, each person bent under a heavy pack. If you stepped out of line to rest, it could be hours before there was a gap to get back in. Moving a whole outfit up the pass took dozens of trips, and many stampeders slid back down to The Scales for the next load.</p>', cont: stairs }) },
          { label: 'Talk to people', fn: () => talk(stairs) }
        ];
        show({ art: 'stairs', opt: { up: S.st.up, total: S.st.total, n: here().length }, title: 'The Golden Stairs', html: h, choices: ch });
      }
      function climbDay(auto) {
        const per = Math.min(stairsLoadsPerDay(), S.st.total - S.st.up), up0 = S.st.up, wx = S.wx.sky;
        show({ art: 'stairs', opt: { prog: 0, up: up0, total: S.st.total, n: here().length }, title: 'Climbing the Golden Stairs', html: '<p class="kdk-tl">' + fmtDate(today()) + ': up you go, one icy step at a time...</p>' + (auto ? '<p class="kdk-dim">Press SPACE or tap to stop after today.</p>' : '') });
        let stop = false;
        if (auto) anyKey = () => { stop = true; const tl = txtEl.querySelector('.kdk-dim'); if (tl) tl.textContent = 'Stopping after today.'; };
        const t0 = performance.now(), dur = ms(auto ? 1100 : 1700);
        const anim = () => {
          tickT = 0;
          if (dead || !S || cur.name !== 'stairs') return;
          const k = Math.min(1, (performance.now() - t0) / dur);
          cur.opt.prog = k; cur.opt.up = up0 + Math.floor(per * k);
          if (k < 1) { if (Math.random() < 0.15) tone(300 + k * 400, 0.03, { vol: 0.025 }); tickT = setTimeout(anim, 30); return; }
          S.st.up = up0 + per;
          const msgs = dayPass('stairs');
          if (wx === 'Heavy snow' && avalancheSeason() && chance(monthNow() >= 1 && monthNow() <= 3 ? 0.14 : 0.06)) msgs.unshift(avalanche());
          status(); save();
          if (!here().length) return runList(msgs, () => gameOver('all'));
          if (S.st.up >= S.st.total) return runList(msgs, stairsDone);
          runList(msgs, () => stairs(auto && !stop && !msgs.length));
        };
        anim();
      }
      function avalanche() {
        let lost = 0;
        FOODS.forEach(k => { lost += lose(k, rnd(0.04, 0.09)); });
        ['tents', 'blankets', 'clothes'].forEach(k => { if (S.g[k] > 1 && chance(0.3)) { S.g[k]--; lost += GOOD[k].lb; } });
        S.st.total = Math.max(S.st.up, S.st.total - Math.floor(lost / 60));
        const m = somebody(); hurt(m, 12);
        return { art: 'stairs', opt: { up: S.st.up, total: S.st.total, n: here().length }, title: 'Avalanche!', sound: () => { sfx('crash'); jingle(J_BAD); },
          html: '<p>With a deep roar, a wall of snow slides down a slope beside the trail! Everyone scrambles clear and nobody is caught, but part of your cache at the foot of the stairs is buried. You dig out most of it, but about ' + lbs(lost) + ' of goods are lost. ' + nm(m) + ' twisted a knee in the scramble.</p>' };
      }
      function stairsDone() {
        S.st = null; S.phase = 'travel';
        jingle(J_WIN);
        show({ art: 'summit', opt: { mountie: false, party: here().length }, title: 'The last load!', html: '<p>The last load of your outfit reaches the top of the Chilkoot Pass. You stand in the wind and look back down the long line of climbers. You did it!</p>', cont: () => arrive('chsummit') });
      }

      /* ---------- the border post ---------- */
      function border() {
        stopRun();
        S.phase = 'border'; save(); music(null);
        const n = here().length, need = BORDER_LB * n, have = foodLb();
        if (have >= need) {
          S.borderOk = true; S.phase = 'travel'; save(); jingle(J_GOOD);
          return show({ art: 'summit', title: 'The border post', html: '<p>A Mountie in a red coat looks over your outfit and checks his list. "' + lbs(have) + ' of food for ' + n + (n === 1 ? ' person' : ' people') + '. That will see you through the winter. Welcome to Canada!"</p><p class="kdk-dim">The North-West Mounted Police insisted that stampeders bring enough food, so that nobody would go hungry in the Yukon over the winter.</p>', cont: campMenu });
        }
        jingle(J_BAD);
        const backId = S.path === 'white' ? 'wpcity' : 'sheep', ch = [];
        ch.push({ label: 'Go back down to ' + LMS[backId].name + ' to buy more food (4 days)', disabled: S.money < 5, fn: () => backDown(backId) });
        if (canHunt() || canFish()) ch.push({ label: 'Go hunting to add to your food', fn: () => forageMenu(border) });
        if (n > 1) ch.push({ label: 'Send one of your companions home (fewer mouths to feed)', fn: sendHome });
        ch.push({ label: 'Check supplies and party', fn: () => supplies(border) });
        ch.push({ label: 'Give up and head home', fn: () => api.msgBox('Head home?', 'Give up the journey and go back to Seattle?', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') gameOver('border'); }) });
        show({ art: 'summit', title: 'Turned back at the border!', html: '<p>The Mountie shakes his head. "The rule is about a year\'s food for each person: ' + lbs(BORDER_LB) + ' a head. You have ' + lbs(have) + ' for ' + n + (n === 1 ? ' person' : ' people') + '. That\'s ' + lbs(need - have) + ' short. I can\'t let you into Canada like this."</p>', ask: 'What will you do?', choices: ch });
      }
      function backDown(id) {
        show({ art: 'trail', opt: { moving: true }, title: 'Back down the trail', html: '<p class="kdk-tl">You leave your outfit at the summit and hike back down to ' + LMS[id].name + '...</p>' });
        let d = 0; const msgs = [];
        const step = () => {
          if (dead || !S) return;
          msgs.push(...dayPass('rest').filter(m => !m.choices)); d++;
          status(); save();
          if (!here().length) return runList(msgs, () => gameOver('all'));
          if (d < 4) { tickT = setTimeout(step, ms(250)); return; }
          runList(msgs, () => storeScreen({ mult: LMS[id].store, name: storeName(id), onlyFood: true, after: border }));
        };
        tickT = setTimeout(step, ms(250));
      }
      function sendHome() {
        const ch = here().filter(m => m !== S.party[0]).map(m => ({ label: esc(m.name), fn: () => {
          m.gone = true; m.sent = true; save();
          show({ art: 'farewell', title: esc(m.name) + ' heads home', html: '<p>' + nm(m) + ' agrees to head home. "Save me a nugget!" ' + esc(m.name) + ' calls, waving all the way down the trail.</p>', cont: border });
        } }));
        ch.push({ label: 'Never mind', fn: border });
        show({ art: 'summit', title: 'Who will go home?', choices: ch });
      }

      /* ---------- Lake Bennett: the boat ---------- */
      function buildDays(careful) { return Math.ceil((careful ? 24 : 15) * (S.bg === 2 ? 0.5 : 1) * Math.sqrt(4 / clamp(here().length, 1, 4))); }
      function boatMenu() {
        stopRun();
        S.atLm = 'bennett'; S.phase = 'travel'; save();
        const price = Math.round(220 * S.priceMult);
        if (S.build) {
          return show({ art: 'saw', opt: { prog: S.build.done / S.build.need }, title: 'Your boat', html: '<p>Your boat is ' + Math.round(100 * S.build.done / S.build.need) + '% finished.</p>', choices: [
            { label: 'Get back to work', fn: buildLoop }, { label: 'Check supplies and party', fn: () => supplies(boatMenu) }, { label: 'Change pace or rations', fn: () => paceMenu(boatMenu) },
            { label: 'Stop to rest', fn: () => restMenu(boatMenu) }, canHunt() || canFish() ? { label: 'Go hunting or fishing', fn: () => forageMenu(boatMenu) } : null, { label: 'Buy supplies', fn: () => storeScreen({ mult: LMS.bennett.store, name: storeName('bennett'), after: boatMenu }) }] });
        }
        const can = S.g.tools >= 1 && S.g.nails >= 1;
        let h = '<p>To build a boat you need a set of carpenter\'s tools and at least one keg of nails and pitch. More kegs (up to three) make a tighter boat, and a spare keg is handy for patching leaks. You have ' + plural(Math.floor(S.g.tools), 'set') + ' of tools and ' + plural(Math.floor(S.g.nails), 'keg') + ' of nails and pitch.</p>';
        if (S.bg === 2) h += '<p class="kdk-g">As a carpenter, you build twice as fast, and better.</p>';
        h += '<p class="kdk-dim">The pace you set changes how fast the work goes.</p>';
        show({ art: 'bennett', title: 'Build a boat', html: h, choices: [
          { label: 'Build it quickly (about ' + buildDays(false) + ' days)', disabled: !can, fn: () => startBuild('quick') },
          { label: 'Build it carefully (about ' + buildDays(true) + ' days, a sturdier boat)', disabled: !can, fn: () => startBuild('careful') },
          { label: 'Buy a finished boat from a builder (' + money(price) + ')', disabled: S.money < price, fn: () => { S.money -= price; S.boat = { hp: 72, q: 72 }; save(); jingle(J_GOOD); show({ art: 'bennett', title: 'Sold!', html: '<p>You buy a sturdy boat from a builder who is staying behind to build more. She says: "Keep her off the rocks and she\'ll get you there."</p>', cont: campMenu }); } },
          { label: 'Work for a boatbuilder in exchange for an old boat (about 20 days)', fn: () => startBuild('work') },
          { label: 'Buy supplies', fn: () => storeScreen({ mult: LMS.bennett.store, name: storeName('bennett'), after: boatMenu }) },
          { label: 'Not now', fn: campMenu }] });
      }
      function startBuild(kind) {
        let q = 50;
        if (kind !== 'work') { q = 45 + Math.min(3, Math.floor(S.g.nails)) * 10 + (kind === 'careful' ? 15 : 0) + (S.bg === 2 ? 12 : 0) + (S.g.rope >= 1 ? 3 : 0); S.g.nails -= Math.min(Math.floor(S.g.nails), 2); }
        S.build = { need: kind === 'work' ? 20 : buildDays(kind === 'careful'), done: 0, q: Math.min(100, q), kind };
        buildLoop();
      }
      function buildLoop() {
        stopRun();
        S.phase = 'build'; save(); music('trail');
        const B = S.build;
        show({ art: 'saw', opt: { prog: B.done / B.need }, title: B.kind === 'work' ? 'Working for the boatbuilder' : 'Building your boat', html: '<p class="kdk-tl"></p>', cont: () => { stopRun(); boatMenu(); }, contLabel: coarse ? 'Tap here to stop work for now' : 'Press SPACE to stop work for now' });
        const upd = () => { const tl = txtEl.querySelector('.kdk-tl'); if (tl) tl.innerHTML = fmtDate(today()) + ': ' + (B.kind === 'work' ? 'sawing planks for the boatbuilder' : 'felling trees, whipsawing planks and fitting them together') + '. The boat is <b>' + Math.round(100 * Math.min(1, B.done / B.need)) + '%</b> done.'; cur.opt.prog = B.done / B.need; };
        upd();
        running = true;
        const step = () => {
          tickT = 0;
          if (!running || dead || !S) return;
          const msgs = dayPass('work');
          B.done += B.kind === 'work' ? 1 : [1, 1.25, 1.5][S.pace] * healthF();
          upd(); status(); save();
          if (!here().length) { stopRun(); return runList(msgs, () => gameOver('all')); }
          if (B.done >= B.need) { stopRun(); return runList(msgs, finishBoat); }
          if (msgs.length) { stopRun(); return runList(msgs, buildLoop); }
          tickT = setTimeout(step, tickMs() * 1.3);
        };
        tickT = setTimeout(step, tickMs() * 1.3);
      }
      function finishBoat() {
        const B = S.build; S.build = null; S.phase = 'travel';
        S.boat = { hp: B.q, q: B.q };
        jingle(J_WIN);
        const word = B.q >= 85 ? 'a fine, tight boat' : B.q >= 65 ? 'a good, sturdy boat' : B.q >= 50 ? 'a plain but serviceable boat' : 'a leaky old tub, but it floats';
        show({ art: 'saw', opt: { prog: 1 }, title: 'The boat is finished!', html: '<p>' + (B.kind === 'work' ? 'The boatbuilder keeps his word and hands over an old boat he patched up.' : 'You drive the last nail and brush pitch into the last seam.') + ' It is ' + word + ' (' + B.q + '% sound).</p>' + (frozen() ? '<p>The lake is still frozen. You will have to wait for the ice to go out before you can launch.</p>' : ''), cont: campMenu });
      }

      /* ---------- rapids ---------- */
      function rapidsChoice(id) {
        stopRun();
        const kind = LMS[id].rapids, rule = today() >= Date.UTC(1898, 5, 6), fee = 25;
        S.pending = id; S.phase = 'travel'; save(); music(null);
        const lm = LMS[id];
        if (kind === 'five') {
          return show({ art: 'fivefinger', title: 'Five Finger Rapids', html: '<p>Four rock islands split the river into five channels, numbered here from left to right. Which way will you go?</p>', choices: [
            { label: 'Take the right-hand channel (number 5)', fn: () => rapidsGame('five', { easy: true }) },
            { label: 'Try a middle channel (number 3)', fn: () => rapidsGame('five', { easy: false }) },
            { label: 'Line the boat along the bank with ropes (about 2 days)', fn: () => lineBoat(2) },
            { label: 'Read about Five Finger Rapids', fn: () => readNote(id, () => rapidsChoice(id)) },
            { label: 'Talk to people', fn: () => talk(() => rapidsChoice(id)) }] });
        }
        const what = kind === 'miles' ? 'the canyon' : 'the rapids';
        let h = '<p>' + (kind === 'miles' ? 'The whole Yukon River squeezes into a narrow gorge between walls of rock. Partway through, the water swirls in a whirlpool.' : 'Rocks, big standing waves and white foam fill the river.') + ' What will you do?</p>';
        if (rule) h += '<p class="kdk-r">By order of the Mounties, no boat may go through without a qualified pilot at the helm.</p>';
        show({ art: lm.scene, title: esc(lm.name), html: h, choices: [
          { label: rule ? 'Take the steering oar yourself, with a licensed pilot beside you (' + money(fee) + ')' : 'Run ' + what + ' yourselves', disabled: rule && S.money < fee, fn: () => { if (rule) S.money -= fee; rapidsGame(kind, { pilot: rule }); } },
          { label: 'Hire a pilot to take your boat through (' + money(fee) + ')', disabled: S.money < fee, fn: () => pilot(fee) },
          { label: 'Line the boat down along the bank and carry the goods around (about 3 days)', fn: () => lineBoat(3) },
          { label: 'Read about ' + esc(lm.name), fn: () => readNote(id, () => rapidsChoice(id)) },
          { label: 'Talk to the pilots', fn: () => talk(() => rapidsChoice(id)) }] });
      }
      function rapidsCleared(title, html, extra, next = campMenu) {
        S.pending = null; save();
        const msgs = dayPass('rest').filter(m => !m.choices);
        show(Object.assign({ art: LMS[S.atLm].scene, title, html }, extra || {}, { cont: () => { G = null; runList(msgs, next); } }));
      }
      function pilot(fee) {
        S.money -= fee;
        const dmg = irnd(0, 3); S.boat.hp = Math.max(5, S.boat.hp - dmg);
        jingle(J_GOOD);
        rapidsCleared('Safely through', '<p>The pilot takes the steering oar while the rest of you walk around on the bank. Your boat shoots through the white water, bucking and spinning, and comes out safe at the bottom. The pilot tips his hat, collects his ' + money(fee) + ' and walks back up for the next boat.</p>');
      }
      function lineBoat(days) {
        let lostTxt = '';
        if (chance(0.3)) { const k = biggestFood(), amt = Math.min(S.g[k], irnd(25, 60)); S.g[k] -= amt; lostTxt = ' One crate slips off a slippery rock into the river: ' + lbs(amt) + ' of ' + FOODNAME[k] + ' are gone.'; }
        S.boat.hp = Math.max(5, S.boat.hp - irnd(0, 4));
        const msgs = [];
        for (let i = 0; i < days - 1; i++) msgs.push(...dayPass('work').filter(m => !m.choices));
        rapidsCleared('The slow, safe way', '<p>You unload the boat and carry your outfit around on your backs. Then you ease the empty boat down along the bank with ropes, one rock at a time. It takes ' + days + ' long days of hard work.' + lostTxt + '</p>', null, () => runList(msgs, campMenu));
      }

      /* ---------- winter ---------- */
      function freezeUp() {
        S.phase = 'winter'; S.slush = false;
        const prev = (routeList().filter(x => x.mi <= S.mi).pop() || { id: 'bennett' }).id;
        S.campName = S.atLm ? LMS[S.atLm].name : 'the river below ' + LMS[prev].name;
        save(); jingle(J_BAD);
        show({ art: 'winter', opt: { cabin: false }, title: 'Freeze-up!', html: '<p>Ice is closing over the river. No boat can travel until the ice goes out in the spring. You haul your boat up onto the bank, safe from the ice, and make a winter camp near ' + esc(S.campName) + '.</p><p class="kdk-dim">Thousands of stampeders spent the winter of 1897-98 frozen in along the trail and the river, waiting for spring.</p>', cont: winterCamp });
      }
      function daysToThaw() {
        let d = 0; const t = S.day; while (d < 400 && frozen(dateOf(t + d))) d++;
        return d;
      }
      function winterCamp(at) {
        stopRun();
        if (at) S.atLm = at;
        if (S.phase !== 'winter') { S.phase = 'winter'; S.campName = S.atLm ? LMS[S.atLm].name : S.campName || 'the river'; }
        if (!frozen()) return thaw();
        music('winter');
        if (!S.cabin && S.g.tools >= 1 && !(monthNow() >= 4 && monthNow() <= 8)) {
          S.cabin = true; save();
          return show({ art: 'winter', opt: { cabin: true }, title: 'A cabin for the winter', html: '<p>With your axe and saw you cut spruce logs and build a snug little cabin, chinked with moss. It will be much warmer than a tent.</p>', cont: () => winterCamp() });
        }
        save();
        const lm = S.atLm ? LMS[S.atLm] : null, n = here().length, perDay = RATIONS[S.ration].lb * n, thaw = daysToThaw();
        const ch = [
          { label: 'Wait one week', fn: () => waitDays(7) },
          { label: 'Wait until the ice goes out (about ' + plural(thaw, 'day') + ')', fn: () => waitDays(9999) },
          canHunt() || canFish() ? { label: 'Go hunting or ice fishing', fn: () => forageMenu(winterCamp) } : null,
          { label: 'Check supplies and party', fn: () => supplies(winterCamp) },
          { label: 'Look at the map', fn: () => showMap(winterCamp) },
          { label: 'Change rations', fn: () => paceMenu(winterCamp) },
          lm ? { label: 'Read about ' + lm.name, fn: () => readNote(S.atLm, winterCamp) } : null,
          lm && TALK[S.atLm] ? { label: 'Talk to people', fn: () => talk(winterCamp) } : null,
          lm && lm.trade ? { label: 'Trade with other stampeders', fn: () => trade(winterCamp) } : null,
          lm && lm.store ? { label: 'Buy supplies', fn: () => storeScreen({ mult: lm.store, name: storeName(S.atLm), after: winterCamp }) } : null
        ].filter(Boolean);
        const days = perDay ? Math.floor(foodLb() / perDay) : 0;
        const spring = monthNow() >= 3 && monthNow() <= 6;
        show({ art: spring && S.atLm ? LMS[S.atLm].scene : 'winter', opt: { cabin: S.cabin, sled: S.g.sled > 0, seed: 3 }, title: (spring ? 'Waiting for the ice: ' : 'Winter camp: ') + esc(S.campName), html: '<p>' + fmtDate(today()) + '. The ice will not go out until about the end of May. You have food for about <b>' + plural(days, 'day') + '</b> at ' + RATIONS[S.ration].name.toLowerCase() + ' rations' + (days < thaw ? ', <span class="kdk-r">but the thaw is ' + plural(thaw, 'day') + ' away</span>. Smaller rations, hunting and fishing will help.' : '.') + '</p>', choices: ch });
      }
      function waitDays(d) {
        const spring = monthNow() >= 3 && monthNow() <= 6;
        show({ art: spring && S.atLm ? LMS[S.atLm].scene : 'winter', opt: { cabin: S.cabin, sled: S.g.sled > 0, seed: 3 }, title: 'Waiting for the ice to go out', html: '<p class="kdk-tl"></p>', cont: () => { stopRun(); winterCamp(); }, contLabel: coarse ? 'Tap here to stop waiting' : 'Press SPACE to stop waiting' });
        running = true;
        let left = d;
        const step = () => {
          tickT = 0;
          if (!running || dead || !S) return;
          const msgs = dayPass('camp'); left--;
          const tl = txtEl.querySelector('.kdk-tl'); if (tl) tl.innerHTML = fmtDate(today()) + '. Food left: ' + lbs(foodLb()) + '.';
          status(); save();
          if (!here().length) { stopRun(); return runList(msgs, () => gameOver('all')); }
          if (!frozen()) { stopRun(); return runList(msgs, thaw); }
          if (msgs.length || left <= 0) { stopRun(); return runList(msgs, winterCamp); }
          tickT = setTimeout(step, dev.fast ? 4 : Math.max(60, tickMs() / 3));
        };
        tickT = setTimeout(step, 60);
      }
      function thaw() {
        S.phase = 'travel'; S.cabin = false; S.slush = false; save();
        jingle(J_WIN);
        show({ art: S.atLm ? LMS[S.atLm].scene : 'river', opt: { seed: 3 }, title: 'The ice goes out!', html: '<p>' + fmtDate(today()) + '. With a groan and a roar, the ice breaks up. Huge slabs grind past for days, and then the water runs clear. Everyone cheers. It is time to go!</p>', cont: () => { if (S.atLm) campMenu(); else travel(); } });
      }

      /* ---------- stores ---------- */
      const CATS = [['Food', FOODS], ['Clothing and camp', ['clothes', 'blankets', 'tents', 'candles', 'medicine']], ['Boat building', ['tools', 'nails', 'rope']], ['Hunting and fishing', ['rifle', 'ammo', 'fishing']], ['Hauling', ['sled', 'horses']]];
      const CLERK = [
        'The Mounties at the border count every pound of food. A thousand pounds a head, or back down the mountain you go. You\'ll eat on the way, so buy extra.',
        'Every pound you buy, you have to carry up that mountain one load at a time. Buy what you need, not what looks nice on the shelf.',
        'Bring carpenter\'s tools and two or three kegs of nails and pitch. Nobody up there sells a boat at a sensible price.',
        'Dried fruit helps keep scurvy away over the long winter. Don\'t skimp on it.',
        'A warm outfit and a pair of wool blankets for every person. The Yukon cold is nothing like a Seattle winter.',
        'Going in winter? Take a hand sled or two. Over hard snow, a person can haul twice the load.',
        'Horses can\'t climb the last pitch of the Chilkoot. They do fine on the White Pass, when it isn\'t mud.',
        'A rifle and some cartridges, or a fishing kit, can stretch your food a long way.',
        'Keep some money in your pocket. Packers, pilots and boatbuilders all want paying.',
        'Candles! The winter nights up north are long. Without light, the days drag and spirits sink.'
      ];
      function haveStr(k) {
        const v = S.g[k], g = GOOD[k];
        if (g.food) return lbs(v);
        if (k === 'ammo') return Math.floor(v) + ' cartridges';
        if (k === 'medicine') return Math.floor(v) + ' uses';
        if (k === 'candles') return Math.floor(v) + ' candles';
        return String(Math.floor(v));
      }
      function storeScreen(o) {
        stopRun(); G = null;
        const seattle = !!o.seattle, cart = {}, n = here().length, mult = (o.mult || 1) * S.priceMult;
        const items = GOODS.filter(g => (!o.onlyFood || g.food) && (g.k !== 'horses' || seattle || S.atLm === 'skagway'));
        const price = g => Math.round(g.price * mult * 100) / 100;
        const bill = () => items.reduce((a, g) => a + (cart[g.k] || 0) * price(g), 0);
        const foodAfter = () => foodLb() + FOODS.reduce((a, k) => a + (cart[k] || 0) * GOOD[k].per, 0);
        const wAfter = () => weight() + items.reduce((a, g) => a + (g.k === 'horses' ? 0 : (cart[g.k] || 0) * g.lb), 0);
        let sel = 0, adv = 0;
        let h = '<p>' + (seattle ? 'The clerk rubs his hands together. "Heading for the Klondike? You\'ve come to the right place!"' : 'Prices here are ' + (o.mult > 1 ? Math.round((o.mult - 1) * 100) + '% higher than in Seattle. Everything had to be carried in.' : 'fair.')) + ' You have <b class="kdk-g">' + money(S.money) + '</b>.</p><div class="kdk-shop">';
        CATS.forEach(([cat, keys]) => {
          const rows = keys.map(k => GOOD[k]).filter(g => items.includes(g));
          if (!rows.length) return;
          h += '<div class="kdk-cat">' + cat + '</div>';
          rows.forEach(g => {
            h += '<div class="kdk-row" data-k="' + g.k + '"><span>' + g.name + '<small>' + g.unit + ', ' + money(price(g)) + (S.g[g.k] >= 0.5 ? ' (have ' + haveStr(g.k) + ')' : '') + (g.note ? '. ' + g.note : '') + '</small></span>' +
              '<button class="btn" data-d="-1" aria-label="Fewer">-</button><input type="text" inputmode="numeric" value="0" aria-label="' + g.name + ' quantity"><button class="btn" data-d="1" aria-label="More">+</button><span class="kdk-c">$0.00</span></div>';
          });
        });
        h += '</div><div class="kdk-tot"></div>';
        const choices = [];
        if (seattle) choices.push({ label: 'Fill my cart with the clerk\'s standard outfit', fn: () => standard() });
        choices.push({ label: seattle ? 'Ask the clerk for advice' : 'Ask the storekeeper for advice', fn: () => { const a = CLERK[adv++ % CLERK.length]; api.msgBox(seattle ? 'The clerk says' : 'The storekeeper says', a); } });
        choices.push({ label: 'Clear my cart', fn: () => { items.forEach(g => { cart[g.k] = 0; }); refresh(); } });
        choices.push({ label: seattle ? 'Pay and head for the steamer' : 'Pay and leave the store', fn: () => done() });
        show({ art: 'store', small: true, side: !(W.body.clientWidth < 560), title: esc(o.name || 'General Store'), html: h, choices, after: bind });
        function rowEl(k) { return txtEl.querySelector('.kdk-row[data-k="' + k + '"]'); }
        function refresh() {
          items.forEach(g => { const r = rowEl(g.k); if (!r) return; r.querySelector('input').value = cart[g.k] || 0; r.querySelector('.kdk-c').textContent = money((cart[g.k] || 0) * price(g)); });
          const f = foodAfter(), per = f / Math.max(1, n), tot = txtEl.querySelector('.kdk-tot');
          if (tot) tot.innerHTML = '<span>Bill: <b>' + money(bill()) + '</b></span><span>Money left: <b class="kdk-g">' + money(S.money - bill()) + '</b></span><span>Food: <b class="' + (per < BORDER_LB + 150 && !S.borderOk ? 'kdk-r' : 'kdk-g') + '">' + lbs(per) + '</b> per person</span><span>Outfit: <b>' + lbs(wAfter()) + '</b></span>';
        }
        function setQty(k, v) {
          const g = GOOD[k]; v = clamp(Math.floor(+v || 0), 0, g.max);
          const other = bill() - (cart[k] || 0) * price(g), afford = Math.floor((S.money - other + 1e-9) / price(g));
          if (v > afford) { v = Math.max(0, afford); sfx('beep'); }
          cart[k] = v; refresh();
        }
        function select(i) {
          const rows = [...txtEl.querySelectorAll('.kdk-row')]; if (!rows.length) return;
          sel = (i + rows.length) % rows.length;
          rows.forEach((r, j) => r.classList.toggle('kdk-sel', j === sel));
          rows[sel].scrollIntoView({ block: 'nearest' });
        }
        function bind() {
          const shop = txtEl.querySelector('.kdk-shop');
          shop.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; const k = b.closest('.kdk-row').dataset.k; sfx('click'); setQty(k, (cart[k] || 0) + (+b.dataset.d)); });
          shop.addEventListener('change', e => { const r = e.target.closest('.kdk-row'); if (r) setQty(r.dataset.k, e.target.value); });
          shop.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); } });
          shop.addEventListener('focusin', e => { const r = e.target.closest('.kdk-row'); if (r) select([...txtEl.querySelectorAll('.kdk-row')].indexOf(r)); });
          extraKey = e => {
            const rows = [...txtEl.querySelectorAll('.kdk-row')], k = rows[sel] && rows[sel].dataset.k;
            if (e.key === 'ArrowDown') { select(sel + 1); return true; }
            if (e.key === 'ArrowUp') { select(sel - 1); return true; }
            if (k && (e.key === 'ArrowRight' || e.key === '+' || e.key === '=')) { sfx('click'); setQty(k, (cart[k] || 0) + 1); return true; }
            if (k && (e.key === 'ArrowLeft' || e.key === '-')) { sfx('click'); setQty(k, (cart[k] || 0) - 1); return true; }
            return false;
          };
          select(0); refresh();
        }
        function standard() {
          const winter = S.m0 >= 9 || S.m0 <= 2, per = { flour: 10, bacon: 8, beans: 7, fruit: 6, coffee: 4, sugar: 6 };
          const want = { clothes: n, blankets: n, tents: Math.ceil(n / 3), tools: 1, rope: 2, nails: 2, rifle: 1, ammo: 3, fishing: 1, medicine: 1, candles: winter ? 3 : 1, sled: winter ? 2 : 0, horses: 0 };
          FOODS.forEach(k => { want[k] = per[k] * n; });
          const gearCost = items.filter(g => !g.food).reduce((a, g) => a + (want[g.k] || 0) * price(g), 0);
          const foodCost = FOODS.reduce((a, k) => a + want[k] * price(GOOD[k]), 0);
          const f = Math.min(1, Math.max(0, (S.money - gearCost) / foodCost));
          items.forEach(g => { cart[g.k] = g.food ? Math.floor(want[g.k] * f) : (want[g.k] || 0); });
          while (bill() > S.money + 1e-9) { const k = FOODS.slice().sort((a, b) => cart[b] - cart[a])[0]; if (!cart[k]) break; cart[k]--; }
          sfx('ding'); refresh();
          api.msgBox('The clerk says', f < 1 ? 'That\'s about all your money will stretch to. It\'s a bit light on food, mind. You may want to swap some gear for more grub.' : 'There you are: a year\'s grub for every one of you, plus the gear you need. Look it over, and change anything you like.');
        }
        function done() {
          const b = bill();
          const commit = () => {
            items.forEach(g => { const u = cart[g.k] || 0; if (u) S.g[g.k] += u * g.per; });
            S.money = Math.max(0, S.money - b); save();
            if (b > 0) sfx('ding');
            o.after();
          };
          if (!seattle) return commit();
          const warn = [], per = foodAfter() / n;
          if (per < BORDER_LB + 150) warn.push('The Mounties at the border want to see ' + lbs(BORDER_LB) + ' of food per person, and you will eat some on the way. You only have ' + lbs(per) + ' each.');
          if ((S.g.tools + (cart.tools || 0)) < 1 || (S.g.nails + (cart.nails || 0)) < 1) warn.push('You have no carpenter\'s tools or no nails and pitch for building a boat at Lake Bennett.');
          if ((S.g.clothes + (cart.clothes || 0)) < n) warn.push('Not everyone has warm clothing.');
          if (!warn.length) return commit();
          api.msgBox('The clerk frowns', warn.join('\n\n') + '\n\nLeave the store anyway?', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') commit(); });
        }
      }

      /* ---------- title, setup and Seattle ---------- */
      function title() {
        stopRun(); G = null;
        music('title');
        const ch = [];
        if (S) ch.push({ label: 'Continue your journey <span class="kdk-dim">(' + esc(S.party[0].name) + ', ' + fmtShort(today()) + ')</span>', fn: resume });
        ch.push({ label: 'Start a new journey', fn: newGame });
        ch.push({ label: 'How to play', fn: () => howTo(title) });
        ch.push({ label: 'About the Klondike Gold Rush', fn: () => about(title) });
        ch.push({ label: 'Hall of fame', fn: () => hall(title) });
        ch.push({ label: 'Sound: ' + (opt.sound ? 'on' : 'off'), fn: () => { opt.sound = !opt.sound; saveOpt(); title(); } });
        ch.push({ label: 'Music: ' + (opt.music ? 'on' : 'off'), fn: () => { opt.music = !opt.music; saveOpt(); if (!opt.music) music(null); title(); } });
        show({ art: 'title', side: false, html: '<p>It is the summer of 1897, and amazing news has reached Seattle: <b>gold in the Klondike!</b> Thousands are rushing north. Can you lead your party over the mountains and down the Yukon River to Dawson City?</p>', ask: 'You may:', choices: ch });
      }
      function newGame() {
        if (S) return api.msgBox('New journey', 'Start a new journey? Your journey in progress will be lost.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') { S = null; api.save('game', null); setupBg(); } });
        setupBg();
      }
      function setupBg() {
        stopRun(); G = null; music('title');
        show({ art: 'seattle', side: false, title: 'Who are you?', html: BGS.map(b => '<p><b>' + b.name + '</b> (' + money(b.money) + ', points x' + b.mult + '): ' + b.desc + '</p>').join(''), ask: 'Choose your background:',
          choices: BGS.map((b, i) => ({ label: b.name, fn: () => setupNames(i) })).concat([{ label: 'Back to the title screen', fn: title }]) });
      }
      function randNames() { const a = NAMES.slice().sort(() => Math.random() - 0.5); return a.slice(0, 5); }
      function setupNames(bg, names = randNames()) {
        const labels = ['You', 'Companion 1', 'Companion 2', 'Companion 3', 'Companion 4'];
        const read = () => [...txtEl.querySelectorAll('.kdk-in input')].map((el, i) => (el.value.replace(/[<>&"]/g, '').trim().slice(0, 12)) || names[i]);
        show({ art: 'seattle', side: false, title: 'Name your party', html: '<p>Five stampeders will travel together. Type a name for yourself and each of your companions.</p><div class="kdk-in">' + labels.map((l, i) => '<label for="kdk-n' + i + '">' + l + ':</label><input id="kdk-n' + i + '" maxlength="12" autocomplete="off" value="' + esc(names[i]) + '">').join('') + '</div>',
          choices: [{ label: 'These names are fine', fn: () => setupMonth(bg, read()) }, { label: 'Pick new random names', fn: () => setupNames(bg) }, { label: 'Back', fn: setupBg }],
          after: el => { el.querySelectorAll('.kdk-in input').forEach((inp, i, all) => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); else setupMonth(bg, read()); } })); } });
      }
      function setupMonth(bg, names) {
        show({ art: 'seattle', side: false, title: 'When will you leave Seattle?', html: '<p>The rush is on! Leave early to race the Yukon freeze-up, or leave later and haul over the snow. Prices go up as the crowds grow.</p>',
          choices: DEPART.map((d, i) => ({ label: MON[d.m] + ' ' + d.y + (d.price > 1 ? ' <span class="kdk-dim">(prices +' + Math.round((d.price - 1) * 100) + '%)</span>' : '') + '<br><small class="kdk-dim">&nbsp; &nbsp; ' + d.desc + '</small>', fn: () => startGame(bg, names, i) })) });
      }
      function startGame(bg, names, di) {
        const D = DEPART[di], g = { fresh: 0 };
        GOODS.forEach(x => { g[x.k] = 0; });
        S = { v: 1, bg, party: names.map(name => ({ name, hp: 100, ill: null, gone: false })), y0: D.y, m0: D.m, day: 0, money: BGS[bg].money, priceMult: D.price, g,
          mi: 0, path: null, bennettMi: 1037, pace: 0, ration: 0, atLm: 'seattle', phase: 'store', seen: ['seattle'], freezeDoy: irnd(288, 300), breakDoy: irnd(144, 151),
          wx: null, noFresh: 0, lost: 0, st: null, boat: null, launched: false, borderOk: false, hired: null, pending: null, gold: 0, cool: 3 };
        rollWeather(); save();
        seattleIntro();
      }
      function seattleIntro() {
        stopRun();
        S.phase = 'store'; S.atLm = 'seattle'; save();
        music('title');
        show({ art: 'seattle', title: 'Seattle, ' + fmtDate(today()), html: '<p>The docks are packed with stampeders, crates, dogs and horses. Every store in town has a sign in the window: <i>KLONDIKE OUTFITS</i>.</p><p>You have <b>' + money(S.money) + '</b> to spend. Before you board the steamer north, you must buy everything your party will need for a whole year.</p>',
          choices: [{ label: 'Go to the outfitting store', fn: () => storeScreen({ seattle: true, mult: 1, name: 'Puget Sound Outfitting Co.', after: depart }) }, { label: 'Read about Seattle', fn: () => readNote('seattle', seattleIntro) }, { label: 'Talk to people', fn: () => talk(seattleIntro) }] });
      }
      function depart() {
        S.phase = 'travel'; S.atLm = null; save();
        jingle([[60, 0], [60, 0.25], [67, 0.5, 0.6]], 'triangle');
        show({ art: 'seattle', title: 'All aboard!', html: '<p>Your outfit, ' + lbs(weight()) + ' of it, is hoisted into the hold of the S.S. <i>Northern Star</i>. The whistle blows, the crowd on the dock cheers, and you steam out into Puget Sound. Skagway is about 1,000 miles north.</p>', cont: () => { S.mi = 1; travel(); } });
      }
      function resume() {
        if (!S) return title();
        sfx('ding');
        if (!here().length) return gameOver('all');
        switch (S.phase) {
          case 'store': return seattleIntro();
          case 'stairs': return stairs();
          case 'border': return border();
          case 'build': return boatMenu();
          case 'winter': return winterCamp();
          case 'end': return finish();
        }
        if (S.atLm === 'seattle') return seattleIntro();
        campMenu();
      }

      /* ---------- the end of the trail ---------- */
      function finish() {
        stopRun(); G = null;
        S.phase = 'end'; S.atLm = 'dawson'; save();
        music('dawson'); jingle(J_WIN);
        const P = here(), n = P.length, who = n === 5 ? 'all five of you' : S.party[0].gone ? (n === 1 ? 'your companion ' : 'your companions ') + P.map(m => esc(m.name)).join(', ').replace(/, ([^,]*)$/, ' and $1') : n === 1 ? 'you' : n + ' of you';
        show({ art: 'dawson', title: 'Dawson City at last!', html: '<p>' + fmtDate(today()) + '. After ' + S.day + ' days, ' + who + (n === 1 && S.party[0].gone ? ' climbs' : ' climb') + ' out of the boat onto the muddy riverbank at Dawson City. Tents, cabins, dogs and crowds of stampeders stretch as far as you can see. You made it!</p>', cont: claim });
      }
      function claim() {
        show({ art: 'dawson', title: 'Staking a claim', html: '<p>Like most stampeders, you find that the rich creeks, Bonanza and Eldorado, were staked from end to end long before you arrived. At the recorder\'s office you register a claim on a faraway creek that nobody has tried yet.</p><p>But first, why not try your luck with a gold pan on the creek outside town?</p>',
          choices: [{ label: 'Try your luck panning (3 pans)', fn: () => panGame(scoreScreen) }, { label: 'Skip it and see your score', fn: scoreScreen }] });
      }
      function scoreCalc() {
        const P = here(), rows = [];
        rows.push([plural(P.length, 'stampeder') + ' reached Dawson', P.reduce((a, m) => a + 1000 + Math.round(m.hp * 5), 0)]);
        const f = foodLb(); if (f >= 4) rows.push([lbs(f) + ' of food left', Math.floor(f / 4)]);
        if (S.money >= 1) rows.push([money(S.money) + ' in cash', Math.floor(S.money)]);
        if (S.boat) rows.push(['Your boat, ' + Math.round(S.boat.hp) + '% sound', 100 + Math.round(S.boat.hp * 2)]);
        rows.push(['Arrived in ' + S.day + ' days', Math.max(0, 320 - S.day) * 8]);
        if (S.gold > 0) rows.push(['Gold dust panned (' + money(S.gold) + ')', Math.round(S.gold * 40)]);
        const sub = rows.reduce((a, r) => a + r[1], 0), mult = BGS[S.bg].mult;
        return { rows, sub, mult, total: Math.round(sub * mult) };
      }
      function scoreScreen() {
        G = null;
        const sc = scoreCalc();
        if (!S.earned) { S.earned = true; S.earnAmt = clamp(5 + Math.floor(sc.total / 5000), 5, 10); save(); api.earn(S.earnAmt, 'reaching Dawson City'); }
        const tbl = '<table class="kdk-tb">' + sc.rows.map(r => '<tr><td>' + r[0] + '</td><td class="kdk-n">' + r[1].toLocaleString('en-US') + '</td></tr>').join('') +
          '<tr><td>Subtotal</td><td class="kdk-n">' + sc.sub.toLocaleString('en-US') + '</td></tr><tr><td>Bonus for being a ' + BGS[S.bg].name.toLowerCase() + '</td><td class="kdk-n">x' + sc.mult + '</td></tr>' +
          '<tr class="kdk-me"><td>Final score: ' + rankOf(sc.total) + '</td><td class="kdk-n">' + sc.total.toLocaleString('en-US') + '</td></tr></table>';
        show({ art: 'dawson', title: 'Your final score', html: tbl + '<p class="kdk-g">You earned ' + money(S.earnAmt) + ' for reaching Dawson City!</p>', cont: () => {
          const me = { name: S.party[0].name + '\'s party', score: sc.total, rank: rankOf(sc.total), date: fmtShort(today()) };
          hof.push(me); hof.sort((a, b) => b.score - a.score); hof = hof.slice(0, 10); api.save('hof', hof);
          lastEnd = S; S = null; api.save('game', null);
          hall(() => show({ art: 'dawson', side: false, title: 'What next?', html: '<p>Congratulations, sourdough! Your adventure is over, but the North is full of stories.</p>', choices: [{ label: 'Start a new journey', fn: newGame }, { label: 'Read about the Klondike Gold Rush', fn: () => about(title) }, { label: 'Back to the title screen', fn: title }] }), hof.includes(me) ? me : null);
        } });
      }
      function gameOver(reason) {
        stopRun(); G = null;
        const trip = S; lastEnd = S; S = null; api.save('game', null);
        music(null);
        jingle([[67, 0], [65, 0.2], [64, 0.4], [60, 0.6, 0.6]], 'triangle');
        const where = trip && trip.seen.length ? LMS[trip.seen[trip.seen.length - 1]].name : 'Seattle';
        const html = (reason === 'border'
          ? '<p>You haul your outfit back down the trail, sell what you can in Skagway, and catch a steamer home to Seattle. It was a grand adventure, even without the gold, and you will tell stories about the Chilkoot and the Mounties for the rest of your life.</p>'
          : '<p>Everyone in your party has turned back and headed home to recover. Nobody reached Dawson City this time, but everyone is safe, and you all have stories to tell for the rest of your lives. You got as far as ' + esc(where) + '.</p>') +
          '<p class="kdk-dim">You are in good company. Historians think about 100,000 people set out for the Klondike, but only about 30,000 to 40,000 of them ever reached Dawson City.</p><p>Next time, try a lighter pace, fuller rations, more rest and plenty of warm clothing and dried fruit.</p>';
        show({ art: 'farewell', side: false, title: 'Homeward bound', html, choices: [{ label: 'Start a new journey', fn: newGame }, { label: 'Back to the title screen', fn: title }] });
      }
      function hall(back, me) {
        const rows = hof.map((h, i) => '<tr' + (h === me ? ' class="kdk-me"' : '') + '><td>' + (i + 1) + '.</td><td>' + esc(h.name) + '</td><td class="kdk-n">' + h.score.toLocaleString('en-US') + '</td><td>' + (h.rank || rankOf(h.score)) + '</td></tr>').join('');
        show({ art: 'dawson', side: false, title: 'Klondike Hall of Fame', html: '<table class="kdk-tb">' + rows + '</table><p class="kdk-dim">Ranks, from greenest to grandest: Cheechako (a newcomer), Stampeder, Seasoned Stampeder, Sourdough (an old-timer who has lived through a Yukon winter) and Bonanza Legend.</p>', cont: back });
      }
      function howTo(back) {
        show({ art: 'map', big: false, side: false, title: 'How to play', html:
          '<p><b>Your goal:</b> lead your party of five from Seattle to Dawson City, the heart of the Klondike gold fields, with as many people, supplies and days to spare as you can.</p>' +
          '<p><b>Outfitting:</b> buy food and gear in Seattle. The Mounties at the border want to see <b>' + lbs(BORDER_LB) + ' of food per person</b>, and you eat along the way, so buy extra. Bring tools and nails and pitch to build a boat. The clerk\'s standard outfit is a good start.</p>' +
          '<p><b>The trail:</b> you must move your whole outfit, one load at a time. The heavier it is, the slower you go. Hire packers, take sleds over snow, or pack horses on the White Pass to go faster. On the Chilkoot, every load must be carried up the Golden Stairs.</p>' +
          '<p><b>Pace and rations:</b> a faster pace or smaller rations save time and food but wear your party down. Rest to recover. Warm clothing, blankets and a tent matter in the cold. Dried fruit and fresh meat or fish help keep scurvy away.</p>' +
          '<p><b>The river:</b> build a boat at Lake Bennett, then float and row more than 500 miles to Dawson. At Miles Canyon, White Horse Rapids and Five Finger Rapids, choose whether to run the white water (steer with the arrow keys or by tapping left and right), hire a pilot, or go around the slow way.</p>' +
          '<p><b>Freeze-up:</b> lakes and rivers freeze in October and the ice does not go out until late May. If you are caught, you must make a winter camp and wait.</p>' +
          '<p><b>Health:</b> when someone wears out completely, they turn back and head home to recover. If everyone turns back, the journey is over.</p>' +
          '<p><b>Score:</b> points for each person who arrives and their health, food left, cash, your boat, speed and any gold you pan. Harder backgrounds multiply your score. Reaching Dawson earns you money to spend in the Software Store.</p>' +
          '<p><b>Controls:</b> press the number keys or click and tap the choices. Press SPACE or tap the picture to stop while traveling. The game saves as you go.</p>', cont: back });
      }
      function about(back) {
        show({ art: 'map', side: false, title: 'About the Klondike Gold Rush', html:
          '<p>In August 1896, George Carmack, Skookum Jim and Dawson Charlie found gold on Bonanza Creek, a stream that flows into the Klondike River in Canada\'s Yukon. The name Klondike comes from <i>Tr\'ond&euml;k</i>, the Hän people\'s name for the river.</p>' +
          '<p>News reached the outside world in July 1897, when steamers carrying miners and gold arrived in San Francisco and Seattle. Tens of thousands of people, called stampeders, set out for the Klondike.</p>' +
          '<p>Most sailed to Skagway or Dyea in Alaska, crossed the Chilkoot Pass or the White Pass, built boats at Lake Bennett, and floated more than 500 miles down the lakes and the Yukon River to Dawson City. The North-West Mounted Police kept order, checked outfits at the border and recorded boats on the river.</p>' +
          '<p>Historians think about 100,000 people set out, but only about 30,000 to 40,000 reached Dawson, and most of them found the best creeks already claimed. By 1899 news of gold at Nome, Alaska drew many away, and the rush was over.</p>' +
          '<p>Newcomers were called <i>cheechakos</i>. Old-timers who had lived through a Yukon winter were called <i>sourdoughs</i>.</p>' +
          '<p class="kdk-dim">Klondike Trail is fiction set in real places. The people you meet along the way are made up.</p>', cont: back });
      }

      /* ---------- hunting and fishing ---------- */
      function canHunt() { return S.g.rifle >= 1 && S.g.ammo >= 1 && S.mi >= 1000 && place() !== 'sea' && S.atLm !== 'skagway' && S.atLm !== 'dyea' && S.phase !== 'stairs'; }
      function canFish() { return S.g.fishing >= 1 && (S.launched || S.phase === 'winter' || !!(S.atLm && LMS[S.atLm].fish)); }
      const carryLimit = () => Math.min(125, 25 * here().length);
      function forageMenu(back) {
        const ice = frozen();
        show({ art: curArt(), opt: curOpt(), title: 'Hunting and fishing', html: '<p>Fresh meat and fish stretch your food and help keep scurvy away. It takes a whole day. Your party can carry about <b>' + lbs(carryLimit()) + '</b> back to camp, so take only what you need: nothing should go to waste.</p>',
          choices: [{ label: 'Go hunting <span class="kdk-dim">(' + plural(Math.floor(S.g.ammo), 'cartridge') + ')</span>', disabled: !canHunt(), fn: () => huntGame(back) },
            { label: ice ? 'Go ice fishing' : 'Go fishing', disabled: !canFish(), fn: () => fishGame(back) }, { label: 'Never mind', fn: back }] });
      }
      function bindCtl(el) {
        el.querySelectorAll('[data-g]').forEach(b => {
          b.addEventListener('pointerdown', e => { e.preventDefault(); if (G && G.btn) G.btn(b.dataset.g, true); });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, () => { if (G && G.btn) G.btn(b.dataset.g, false); }));
          b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (G && G.btn) { G.btn(b.dataset.g, true); G.btn(b.dataset.g, false); } } });
        });
      }
      function forageEnd(title, html, back) {
        const msgs = dayPass('forage');
        show({ art: cur.name, opt: cur.opt, big: true, side: false, size: [LW, LH], title, html, cont: () => { G = null; runList(msgs, back); } });
        status(false);
      }
      const ARROWS = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd', A: 'l', D: 'r', W: 'u', S: 'd' };
      function pauseKey(g, e, down) { if (down && (e.key === 'p' || e.key === 'P')) { g.paused = !g.paused; return true; } return false; }

      function huntGame(back) {
        stopRun(); music(null);
        const snow = snowGround(), high = ['chsummit', 'wpsummit', 'scales', 'sheep', 'logcabin', 'canyon', 'wpcity'].includes(S.atLm) || S.phase === 'border';
        const SP = [
          { k: 'ptar', name: 'ptarmigan', lb: 1, w: 8, h: 6, v: [55, 85], fly: 1, wt: 4 },
          { k: 'hare', name: 'snowshoe hare', lb: 3, w: 11, h: 9, v: [70, 110], hop: 1, wt: 4 },
          { k: 'grouse', name: 'spruce grouse', lb: 1, w: 8, h: 7, v: [30, 50], wt: snow ? 0 : 2.5 },
          { k: 'sheep', name: 'mountain sheep', lb: 50, w: 20, h: 16, v: [26, 38], wt: high ? 1.3 : 0 },
          { k: 'caribou', name: 'caribou', lb: 80, w: 26, h: 20, v: [30, 44], wt: high ? 0 : 0.8 }
        ].filter(s => s.wt > 0);
        const g = G = { type: 'hunt', left: 40, bag: 0, limit: carryLimit(), shots: 0, an: [], fx: [], cx: 160, cy: 110, spawn: 0.4, snow, high, keys: {}, done: false, paused: false, t: 0 };
        const spawn = () => {
          let tot = SP.reduce((a, s) => a + s.wt, 0), r = Math.random() * tot, s = SP[0];
          for (const x of SP) { if ((r -= x.wt) <= 0) { s = x; break; } }
          const dir = chance(0.5) ? 1 : -1, y = s.fly ? rnd(36, 90) : rnd(122, 164 - s.h);
          g.an.push({ s, x: dir > 0 ? -s.w : 320, y, y0: y, dir, v: rnd(s.v[0], s.v[1]), ph: rnd(0, 6), yoff: 0 });
          g.spawn = rnd(0.6, 1.5);
        };
        const shoot = (x, y) => {
          if (g.done || g.paused) return;
          if (S.g.ammo < 1) return end('ammo');
          S.g.ammo--; g.shots++;
          if (opt.sound) { api.noise(0.18, { ft: 'lowpass', f: 1400, vol: 0.1, decay: 1 }); }
          g.fx.push({ x, y, t: 0.3, kind: 'puff' });
          for (let i = g.an.length - 1; i >= 0; i--) {
            const a = g.an[i];
            if (x >= a.x - 3 && x <= a.x + a.s.w + 3 && y >= a.y + a.yoff - 3 && y <= a.y + a.yoff + a.s.h + 3) {
              g.an.splice(i, 1);
              const take = Math.min(a.s.lb, g.limit - g.bag); g.bag += take;
              g.fx.push({ x: a.x + a.s.w / 2, y: a.y, t: 1.3, kind: 'text', s: 'GOT IT! +' + a.s.lb + ' LB', c: 'y' });
              for (let k = 0; k < 8; k++) g.fx.push({ x: a.x + a.s.w / 2, y: a.y + a.s.h / 2, vx: rnd(-30, 30), vy: rnd(-30, 10), t: 0.5, kind: 'dot' });
              jingle([[76, 0], [83, 0.08, 0.1]]);
              if (g.bag >= g.limit) setTimeout(() => end('full'), 500);
              return;
            }
          }
          g.fx.push({ x, y: y - 8, t: 0.6, kind: 'text', s: 'MISSED', c: 'l' });
          if (S.g.ammo < 1) setTimeout(() => end('ammo'), 500);
        };
        g.update = dt => {
          g.t += dt; g.left -= dt;
          const sp = 150 * dt;
          if (g.keys.l) g.cx -= sp; if (g.keys.r) g.cx += sp; if (g.keys.u) g.cy -= sp; if (g.keys.d) g.cy += sp;
          g.cx = clamp(g.cx, 4, 316); g.cy = clamp(g.cy, 16, 170);
          if ((g.spawn -= dt) <= 0 && g.an.length < 5) spawn();
          g.an.forEach(a => { a.x += a.dir * a.v * dt; if (a.s.fly) a.y = a.y0 + Math.sin(g.t * 3 + a.ph) * 8; if (a.s.hop) a.yoff = -Math.abs(Math.sin(g.t * 9 + a.ph)) * 5; });
          g.an = g.an.filter(a => a.x > -40 && a.x < 360);
          g.fx.forEach(f => { f.t -= dt; if (f.kind === 'dot') { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.kind === 'text') f.y -= 12 * dt; });
          g.fx = g.fx.filter(f => f.t > 0);
          if (g.left <= 0) end('time');
        };
        g.key = (e, down) => {
          if (pauseKey(g, e, down)) return true;
          const k = ARROWS[e.key]; if (k) { g.keys[k] = down; return true; }
          if (e.key === ' ' || e.key === 'Enter') { if (down && !e.repeat) shoot(g.cx, g.cy); return true; }
          return false;
        };
        g.pointer = (e, type) => { if (type === 'down') { const [x, y] = canvasXY(e); g.cx = x; g.cy = y; shoot(x, y); } };
        function end(why) {
          if (g.done) return; g.done = true;
          S.g.fresh += g.bag; save();
          const lead = { full: 'That is all your party can carry back to camp, so you stop. Nothing will go to waste.', time: 'The light is fading, so you head back to camp.', ammo: 'You are out of cartridges.', stop: 'You head back to camp.' }[why];
          jingle(g.bag > 0 ? J_GOOD : J_BAD);
          forageEnd('Back to camp', '<p>' + lead + ' You bring back <b>' + lbs(g.bag) + '</b> of fresh meat, using ' + plural(g.shots, 'cartridge') + '.</p>', back);
        }
        show({ art: 'hunt', big: true, side: false, size: [320, 180], title: 'Hunting', html: '<p>Tap an animal to take a shot, or aim with the arrow keys and press SPACE. Each shot uses one cartridge. Your party can carry <b>' + lbs(g.limit) + '</b>.</p>', choices: [{ label: 'Stop hunting and head back to camp', fn: () => end('stop') }] });
      }
      function drawAnimal(a, t) {
        const s = a.s, x = Math.round(a.x), y = Math.round(a.y + a.yoff), f = Math.floor(t / 120) % 2, snow = G && G.snow;
        const P = (dx, dy, w, h, c) => R(a.dir > 0 ? x + dx : x + s.w - dx - w, y + dy, w, h, c);
        if (s.k === 'ptar') { const c = snow ? 'w' : 'n'; P(1, 2, 6, 3, c); P(5, 0, 3, 3, c); P(7, 1, 1, 1, 'k'); P(0, 2, 2, 2, 'k'); P(2, f ? 0 : 4, 4, 2, snow ? 'l' : 'N'); }
        else if (s.k === 'grouse') { P(0, 2, 7, 4, 'N'); P(5, 0, 3, 3, 'd'); P(7, 1, 1, 1, 'r'); P(2, 6, 1, 1, 'k'); P(4, 6, 1, 1, 'k'); }
        else if (s.k === 'hare') { const c = snow ? 'w' : 't'; P(0, 9, 10, 1, snow ? 'a' : 'D'); P(0, 4, 9, 5, c); if (snow) P(0, 4, 9, 1, 's'); P(7, 2, 4, 4, c); P(8, -2, 1, 4, c); P(10, -2, 1, 4, c); if (snow) { P(8, -2, 1, 1, 'k'); P(10, -2, 1, 1, 'k'); } P(10, 3, 1, 1, 'k'); P(1 + f, 9, 2, 1, c); P(6 - f, 9, 2, 1, c); }
        else if (s.k === 'sheep') { P(0, 4, 16, 8, 'w'); P(15, 1, 5, 6, 'w'); P(14, 0, 4, 3, 't'); P(16, 3, 2, 3, 't'); P(18, 3, 1, 1, 'k'); [2 + f, 5 - f, 11 + f, 14 - f].forEach(lx => P(lx, 12, 2, 4, 'l')); }
        else { P(0, 8, 20, 8, 'n'); P(17, 4, 5, 7, 'e'); P(21, 4, 5, 4, 'N'); P(20, -4, 1, 8, 'N'); P(23, -5, 1, 9, 'N'); P(18, -3, 3, 1, 'N'); P(23, -3, 3, 1, 'N'); P(0, 8, 2, 3, 'w'); [2 + f, 5 - f, 14 + f, 17 - f].forEach(lx => P(lx, 16, 2, 5, 'N')); }
      }
      function huntDraw(t) {
        const g = G && G.type === 'hunt' ? G : { snow: snowGround(), an: [], fx: [], cx: -20, cy: -20, bag: 0, limit: 0, left: 0 };
        sky(skyCols(), 0, 100);
        ridge(30, 60, 26, 30, 11, 'A', 'w', 110);
        ridge(80, 96, 10, 18, 7, g.snow ? 's' : 'D', null, 118);
        R(0, 116, LW, 64, g.snow ? 'w' : 'g'); R(0, 116, LW, 2, g.snow ? 's' : 'D');
        srand(44); for (let i = 0; i < 9; i++) spruce(sr() * LW, 120 + sr() * 4, 12 + sr() * 14, 'D', g.snow);
        for (let i = 0; i < 14; i++) R(sr() * LW, 130 + sr() * 45, 6, 1, g.snow ? 's' : 'D');
        g.an.forEach(a => drawAnimal(a, t));
        g.fx.forEach(f => { if (f.kind === 'text') txt(f.s, f.x, f.y, f.c, 1, true, 'k'); else if (f.kind === 'dot') R(f.x, f.y, 2, 2, g.snow ? 'l' : 'w'); else { R(f.x - 3, f.y - 3, 6, 6, 'l'); R(f.x - 1, f.y - 1, 2, 2, 'w'); } });
        R(0, 170, LW, 10, 'N'); R(0, 170, LW, 1, 't');
        const c = g.cx, y = g.cy;
        R(c - 7, y, 5, 1, 'R'); R(c + 3, y, 5, 1, 'R'); R(c, y - 7, 1, 5, 'R'); R(c, y + 3, 1, 5, 'R'); R(c, y, 1, 1, 'y');
        R(0, 0, LW, 11, 'k');
        txt('MEAT ' + Math.round(g.bag) + '/' + g.limit + ' LB', 3, 2, 'y'); txt('SHOTS ' + (S ? Math.floor(S.g.ammo) : 0), 150, 2, 'C'); txt('TIME ' + Math.max(0, Math.ceil(g.left)), 262, 2, 'w');
        if (g.paused) { R(90, 70, 140, 20, 'k'); txt('PAUSED - PRESS P', 160, 77, 'y', 1, true); }
      }

      function fishGame(back) {
        stopRun(); music(null);
        const ice = frozen(), lakeish = onLake() || ['lindeman', 'bennett', 'tagish', 'marsh', 'laberge'].includes(S.atLm);
        const SP = [
          { name: 'Arctic grayling', lb: 1, d: [52, 92], v: [38, 58], len: 12, c: 'a', fin: 'M', wt: 4 },
          { name: 'whitefish', lb: 3, d: [70, 128], v: [24, 38], len: 16, c: 'l', fin: 'w', wt: 3 },
          { name: 'northern pike', lb: 6, d: [90, 150], v: [18, 30], len: 24, c: 'g', fin: 'y', wt: 2 },
          { name: 'lake trout', lb: 10, d: [125, 165], v: [14, 22], len: 26, c: 'd', fin: 'w', wt: 1.2, lake: 1 }
        ].filter(s => !s.lake || lakeish);
        const g = G = { type: 'fish', left: 45, bag: 0, limit: carryLimit(), hy: 70, ty: null, fish: [], fx: [], bite: null, reel: null, ice, keys: {}, t: 0, spawn: 0.2, done: false, paused: false, caught: {} };
        const set = () => {
          if (g.done || g.paused) return;
          if (g.bite) { g.reel = { f: g.bite.f }; g.bite = null; tone(700, 0.08); tone(900, 0.1, { at: 0.08 }); return; }
          g.fx.push({ x: 168, y: g.hy - 6, t: 0.6, s: 'NOTHING YET', c: 'l' });
          g.fish.forEach(f => { if (Math.abs(f.y - g.hy) < 20) f.shy = true; });
        };
        g.btn = (k, down) => { if (k === 'set') { if (down) set(); } else g.keys[k] = down; };
        g.update = dt => {
          g.t += dt; g.left -= dt;
          if (g.keys.u) { g.hy -= 55 * dt; g.ty = null; } if (g.keys.d) { g.hy += 55 * dt; g.ty = null; }
          if (g.ty != null) { const d = g.ty - g.hy; g.hy += Math.sign(d) * Math.min(Math.abs(d), 70 * dt); if (Math.abs(d) < 1) g.ty = null; }
          g.hy = clamp(g.hy, 48, 168);
          if ((g.spawn -= dt) <= 0 && g.fish.length < 6) {
            let tot = SP.reduce((a, s) => a + s.wt, 0), r = Math.random() * tot, s = SP[0];
            for (const x of SP) { if ((r -= x.wt) <= 0) { s = x; break; } }
            const dir = chance(0.5) ? 1 : -1;
            g.fish.push({ s, x: dir > 0 ? -s.len : 320, y: rnd(s.d[0], s.d[1]), dir, v: rnd(s.v[0], s.v[1]), ph: rnd(0, 6), shy: false });
            g.spawn = rnd(0.8, 2);
          }
          if (g.bite) { g.bite.left -= dt; if (g.bite.left <= 0) { const f = g.bite.f; f.shy = true; f.v *= 2.5; g.bite = null; g.fx.push({ x: 160, y: g.hy - 8, t: 0.9, s: 'IT GOT AWAY', c: 'R' }); } }
          if (g.reel) {
            const f = g.reel.f; f.y -= 80 * dt; f.x += ((160 - (f.dir > 0 ? f.s.len : 0)) - f.x) * Math.min(1, dt * 8);
            if (f.y < 40) {
              g.fish = g.fish.filter(x => x !== f); g.reel = null;
              const take = Math.min(f.s.lb, g.limit - g.bag); g.bag += take; g.caught[f.s.name] = (g.caught[f.s.name] || 0) + 1;
              g.fx.push({ x: 160, y: 30, t: 1.4, s: f.s.name.toUpperCase().replace('ARCTIC ', '') + ' +' + f.s.lb + ' LB', c: 'y' });
              jingle([[72, 0], [79, 0.08], [84, 0.16, 0.14]]);
              if (g.bag >= g.limit) setTimeout(() => end('full'), 600);
            }
          }
          g.fish.forEach(f => {
            if (f === (g.bite && g.bite.f) || f === (g.reel && g.reel.f)) return;
            f.x += f.dir * f.v * dt; f.y += Math.sin(g.t * 2 + f.ph) * 4 * dt;
            const head = f.dir > 0 ? f.x + f.s.len : f.x;
            if (!g.bite && !g.reel && !f.shy && Math.abs(head - 160) < 3 && Math.abs(f.y - g.hy) < 6) {
              if (chance(0.7)) { g.bite = { f, left: 1.0 }; f.x = f.dir > 0 ? 160 - f.s.len : 160; tone(520, 0.06); tone(520, 0.06, { at: 0.12 }); }
              else f.shy = true;
            }
          });
          g.fish = g.fish.filter(f => f.x > -40 && f.x < 360);
          g.fx.forEach(f => { f.t -= dt; f.y -= 10 * dt; }); g.fx = g.fx.filter(f => f.t > 0);
          if (g.left <= 0) end('time');
        };
        g.key = (e, down) => {
          if (pauseKey(g, e, down)) return true;
          if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { g.keys.u = down; return true; }
          if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { g.keys.d = down; return true; }
          if (e.key === ' ' || e.key === 'Enter') { if (down && !e.repeat) set(); return true; }
          return false;
        };
        g.pointer = (e, type) => { if (type !== 'down') return; const [, y] = canvasXY(e); if (g.bite) set(); else if (y > 44) g.ty = y; };
        function end(why) {
          if (g.done) return; g.done = true;
          S.g.fresh += g.bag; save();
          const list = Object.keys(g.caught).map(k => plural(g.caught[k], k, k === 'whitefish' || k === 'Arctic grayling' ? k : k.replace('pike', 'pike').replace('trout', 'trout'))).join(', ');
          jingle(g.bag > 0 ? J_GOOD : J_BAD);
          forageEnd('Back to camp', '<p>' + ({ full: 'That is all your party can carry, so you stop. Nothing will go to waste.', time: 'Your fingers are numb, so you call it a day.', stop: 'You pack up your line.' }[why]) + ' You bring back <b>' + lbs(g.bag) + '</b> of fresh fish' + (list ? ': ' + list : '') + '.</p>', back);
        }
        show({ art: 'fish', big: true, side: false, size: [320, 180], title: ice ? 'Ice fishing' : 'Fishing', html: '<p>Move the hook up and down to a fish. When one bites (the "!" appears), set the hook fast! Tap the water to move the hook, and tap again when a fish bites. Keys: UP, DOWN and SPACE.</p><div class="kdk-ctl"><button class="btn" data-g="u">Up</button><button class="btn" data-g="set">Set the hook!</button><button class="btn" data-g="d">Down</button></div>',
          choices: [{ label: 'Stop fishing and head back to camp', fn: () => end('stop') }], after: bindCtl });
      }
      function fishDraw(t) {
        const g = G && G.type === 'fish' ? G : { ice: frozen(), fish: [], fx: [], hy: 70, bag: 0, limit: 0, left: 0 };
        sky(skyCols(), 0, 40);
        ridge(10, 26, 10, 30, 11, 'A', 'w', 40);
        if (g.ice) { R(0, 32, LW, 10, 'w'); R(0, 40, LW, 3, 's'); R(150, 36, 20, 7, 'b'); }
        else { R(0, 36, LW, 4, 'B'); boat(130, 26, t, { n: 0 }); }
        const bands = vga ? ['#0030a0', '#002888', '#002070', '#001858'] : ['B', 'b', 'b', 'k'];
        bands.forEach((c, i) => R(0, 43 + i * 34, LW, 35, c));
        for (let i = 0; i < 20; i++) R(((i * 41 + t * 0.008) % 340) - 10, 50 + (i * 17) % 120, 4, 1, 'B');
        for (let x = 0; x < LW; x += 6) { const h = 4 + (x * 7) % 9; R(x, 180 - h, 2, h, 'D'); }
        const bob = g.bite ? Math.round(Math.sin(t / 50) * 2) : 0;
        walker(g.ice ? 172 : 150, g.ice ? 18 : 12, 'r', t, false, { pack: false });
        R(163, 24, 1, 10, 'N'); R(160, 24, 4, 1, 'N');
        R(160, 30, 1, g.hy - 30 + bob, 'l'); R(159, g.hy + bob, 3, 3, 'y'); R(161, g.hy + 2 + bob, 1, 2, 'l');
        g.fish.forEach(f => {
          const x = Math.round(f.x), y = Math.round(f.y), L = f.s.len, d = f.dir, wig = Math.floor(t / 150 + f.ph) % 2;
          R(x + 2, y - 2, L - 4, 5, f.s.c); R(x, y - 1, L, 3, f.s.c);
          R(d > 0 ? x + L - 3 : x + 2, y - 1, 1, 1, 'k');
          R(d > 0 ? x - 3 : x + L, y - 2 - wig, 3, 5 + wig, f.s.c);
          R(x + Math.floor(L / 2) - 1, y - 4, 3, 2, f.s.fin);
        });
        if (g.bite) { txt('!', 160, 44 + Math.round(Math.sin(t / 60) * 2), 'y', 2, true, 'r'); }
        g.fx.forEach(f => txt(f.s, f.x, f.y, f.c, 1, true, 'k'));
        R(0, 0, LW, 11, 'k');
        txt('FISH ' + Math.round(g.bag) + '/' + g.limit + ' LB', 3, 2, 'y'); txt('TIME ' + Math.max(0, Math.ceil(g.left)), 262, 2, 'w');
        if (g.paused) { R(90, 90, 140, 20, 'k'); txt('PAUSED - PRESS P', 160, 97, 'y', 1, true); }
      }

      /* ---------- the rapids ---------- */
      function rapidsGame(kind, o = {}) {
        stopRun(); music('rapids');
        const cfg = { miles: { len: 2300, w: 84, rock: 0.5, gap: 105, wave: 0.25, pools: [0.45, 0.78], walls: 1, name: 'MILES CANYON' },
          whitehorse: { len: 2100, w: 120, rock: 0.8, gap: 72, wave: 0.6, pools: [0.35], walls: 0, name: 'WHITE HORSE RAPIDS' },
          five: o.easy ? { len: 1300, w: 120, rock: 0.3, gap: 120, wave: 0.25, pools: [], walls: 0, name: 'FIVE FINGER RAPIDS' } : { len: 1500, w: 86, rock: 0.85, gap: 70, wave: 0.45, pools: [0.5], walls: 1, name: 'FIVE FINGER RAPIDS' } }[kind];
        const easy = o.pilot ? 0.7 : 1;
        const bankAt = y => { let w = cfg.w + Math.sin(y / 170) * 10; cfg.pools.forEach(p => { const d = (y - p * cfg.len) / 110; w += 44 * Math.exp(-d * d); }); return { cx: 100 + Math.sin(y / 300) * 22 + Math.sin(y / 97) * 6, w }; };
        const g = G = { type: 'rapids', kind, cfg, bankAt, y: 0, x: bankAt(0).cx, vx: 0, hull: S.boat.hp, speed: 70, obs: [], inv: 0, hits: 0, lostLb: 0, t: 0, keys: {}, target: null, spin: 0, pilot: !!o.pilot, done: false, paused: false, count: 2.2, fx: [] };
        for (let y = 280; y < cfg.len - 160; y += cfg.gap * rnd(0.7, 1.3)) {
          const B = bankAt(y);
          if (cfg.pools.some(p => Math.abs(y - p * cfg.len) < 60)) continue;
          if (chance(cfg.rock * easy)) g.obs.push({ t: 'rock', y, x: B.cx + rnd(-0.36, 0.36) * B.w, r: rnd(5, 9) });
          if (chance(cfg.wave * easy)) { const B2 = bankAt(y + 35); g.obs.push({ t: 'wave', y: y + 35, x: B2.cx + rnd(-0.3, 0.3) * B2.w, w: rnd(16, 26) }); }
        }
        cfg.pools.forEach(p => g.obs.push({ t: 'pool', y: cfg.len * p, x: bankAt(cfg.len * p).cx + rnd(-8, 8), r: 20 }));
        const hit = (dmg, what) => {
          if (g.inv > 0) return;
          dmg *= (1.3 - S.boat.q / 200) * (g.pilot ? 0.5 : 1);
          g.hull = Math.max(0, g.hull - dmg); g.inv = what === 'wave' ? 0.35 : 0.9; g.hits++;
          if (what === 'rock' || what === 'pool') {
            sfx('crash');
            FOODS.forEach(k => { g.lostLb += lose(k, 0.008); });
            g.fx.push({ x: g.x, y: g.y + 20, t: 1, s: what === 'rock' ? 'CRUNCH!' : 'SPLASH!' });
          } else if (opt.sound) api.noise(0.2, { ft: 'highpass', f: 1500, vol: 0.06, decay: 1 });
        };
        g.btn = (k, down) => { g.keys[k] = down; };
        g.update = dt => {
          if (g.count > 0) { const c0 = Math.ceil(g.count); g.count -= dt; if (Math.ceil(g.count) !== c0 && g.count > 0) tone(440, 0.08); if (g.count <= 0) tone(880, 0.15); return; }
          g.t += dt; g.speed = Math.min(118, 72 + g.t * 1.6); g.y += g.speed * dt;
          let dir = (g.keys.l ? -1 : 0) + (g.keys.r ? 1 : 0);
          if (!dir && g.target != null) { const d = g.target - g.x; if (Math.abs(d) > 3) dir = Math.sign(d); }
          g.vx += dir * 280 * dt; g.vx *= Math.pow(0.05, dt); g.vx = clamp(g.vx, -95, 95); g.x += g.vx * dt;
          const B = bankAt(g.y), L = B.cx - B.w / 2 + 6, Rr = B.cx + B.w / 2 - 6;
          if (g.x < L) { g.x = L; g.vx = Math.abs(g.vx) * 0.5 + 25; hit(4, 'wall'); }
          if (g.x > Rr) { g.x = Rr; g.vx = -Math.abs(g.vx) * 0.5 - 25; hit(4, 'wall'); }
          g.obs.forEach(ob => {
            const dy = ob.y - g.y; if (Math.abs(dy) > 40) return;
            if (ob.t === 'rock' && Math.abs(ob.x - g.x) < ob.r + 4 && Math.abs(dy) < ob.r + 8) { hit(15, 'rock'); g.vx += (g.x < ob.x ? -60 : 60); }
            else if (ob.t === 'wave' && Math.abs(ob.x - g.x) < ob.w / 2 + 3 && Math.abs(dy) < 5) hit(3, 'wave');
            else if (ob.t === 'pool') { const d = Math.hypot(ob.x - g.x, dy); if (d < ob.r + 14) { g.vx += (ob.x - g.x) * 3 * dt; g.spin += dt * 10; if (d < 7) { hit(10, 'pool'); g.y -= 14; g.vx += chance(0.5) ? 70 : -70; } } }
          });
          g.inv -= dt; g.spin *= Math.pow(0.2, dt);
          g.fx.forEach(f => { f.t -= dt; }); g.fx = g.fx.filter(f => f.t > 0);
          if (g.hull <= 0) end('swamp'); else if (g.y >= cfg.len) end('ok');
        };
        g.key = (e, down) => {
          if (pauseKey(g, e, down)) return true;
          const k = ARROWS[e.key]; if (k === 'l' || k === 'r') { g.keys[k] = down; g.target = null; return true; }
          return false;
        };
        g.pointer = (e, type) => {
          if (type === 'up') { g.target = null; return; }
          if (type === 'move' && !(e.buttons & 1) && e.pointerType === 'mouse') return;
          if (type === 'move' && g.target == null && e.pointerType !== 'mouse') return;
          const [x] = canvasXY(e); g.target = clamp(x, 0, 200);
        };
        function end(why) {
          if (g.done) return; g.done = true;
          g.keys = {};
          let h;
          if (why === 'swamp') {
            let lost = g.lostLb; FOODS.forEach(k => { lost += lose(k, 0.06); });
            S.boat.hp = 30; save(); jingle(J_BAD);
            h = '<p>The boat fills with water and everyone splashes ashore, soaked and shivering but safe. You haul the boat out, spend two days drying out and patching it, and count your losses: about ' + lbs(lost) + ' of supplies washed away.</p>';
            const msgs = dayPass('rest').filter(m => !m.choices);
            rapidsCleared('Swamped!', h, { art: 'rapids', big: true, side: false, size: [200, 260] }, () => runList(msgs, campMenu));
          } else {
            S.boat.hp = Math.max(5, Math.round(g.hull)); save();
            jingle(g.hits ? J_GOOD : J_WIN);
            h = '<p>' + (g.hits === 0 ? '<b>A perfect run!</b> Not a single bump.' : 'You made it through! ' + plural(g.hits, 'bump') + ' along the way.') + ' Your boat is ' + S.boat.hp + '% sound.' + (g.lostLb >= 1 ? ' About ' + lbs(g.lostLb) + ' of food went over the side.' : '') + (g.pilot ? ' The pilot grins: "Not bad for a cheechako!"' : '') + '</p>';
            rapidsCleared('Through the white water!', h, { art: 'rapids', big: true, side: false, size: [200, 260] });
          }
          music(null);
        }
        show({ art: 'rapids', big: true, side: false, size: [200, 260], title: cfg.name.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()), html: '<p>Steer with the LEFT and RIGHT arrow keys, or hold a finger on the picture where you want to go. Miss the rocks, the foaming waves and the whirlpools!' + (g.pilot ? ' The pilot beside you helps soften every bump.' : '') + '</p><div class="kdk-ctl"><button class="btn" data-g="l">&lt;&lt; Left</button><button class="btn" data-g="r">Right &gt;&gt;</button></div>', after: bindCtl });
        status(false);
      }
      function rapidsDraw(t) {
        const g = G && G.type === 'rapids' ? G : null;
        if (!g) { R(0, 0, LW, LH, 'b'); return; }
        const cfg = g.cfg, BY = 190, snow = snowGround();
        for (let sy = 0; sy < LH; sy += 2) {
          const wy = g.y + (BY - sy), B = g.bankAt(wy), l = B.cx - B.w / 2, r = B.cx + B.w / 2;
          const bank = cfg.walls ? ((Math.floor(wy / 6) % 2) ? 'd' : 'A') : (snow ? 'w' : 'g');
          R(0, sy, l, 2, bank); R(r, sy, LW - r, 2, bank);
          R(l, sy, r - l, 2, 'b');
          R(l, sy, 3, 2, 'w'); R(r - 3, sy, 3, 2, 'w');
          if (!cfg.walls && Math.floor(wy / 40) % 3 === 0) { R(l - 14, sy, 2, 2, 'D'); R(r + 12, sy, 2, 2, 'D'); }
          if (cfg.walls) { R(l - 6, sy, 1, 2, 'k'); R(r + 5, sy, 1, 2, 'k'); }
        }
        for (let i = 0; i < 30; i++) { const wy = Math.floor(g.y / 40) * 40 + i * 13 + 40, sy = BY - (wy - g.y) + ((i * 7) % 5), B = g.bankAt(wy); if (sy < 0 || sy > LH) continue; R(B.cx + (((i * 37) % 100) / 100 - 0.5) * B.w * 0.9, sy, 1, 5, 'B'); }
        g.obs.forEach(ob => {
          const sy = BY - (ob.y - g.y); if (sy < -30 || sy > LH + 30) return;
          if (ob.t === 'rock') { R(ob.x - ob.r, sy - ob.r * 0.8, ob.r * 2, ob.r * 1.6, 'd'); R(ob.x - ob.r + 2, sy - ob.r * 0.8 + 1, ob.r, 2, 'l'); R(ob.x - ob.r - 1, sy + ob.r * 0.8, ob.r * 2 + 2, 2, 'w'); }
          else if (ob.t === 'wave') { const ph = Math.floor(t / 120) % 2; R(ob.x - ob.w / 2, sy - 1 + ph, ob.w, 2, 'w'); R(ob.x - ob.w / 2 + 3, sy - 3 + ph, ob.w - 6, 2, 'C'); }
          else { for (let k = 0; k < 3; k++) { const rr = ob.r - k * 6, a0 = t / 200 + k; for (let a = 0; a < 6.28; a += 0.4) R(ob.x + Math.cos(a + a0) * rr, sy + Math.sin(a + a0) * rr * 0.7, 2, 1, k === 2 ? 'k' : k ? 'C' : 'w'); } }
        });
        const bx = Math.round(g.x), blink = g.inv > 0 && Math.floor(t / 80) % 2, tilt = Math.round(clamp(g.vx / 40, -2, 2) + Math.sin(g.spin) * 2);
        if (!blink) {
          R(bx - 2 + tilt, BY - 11, 4, 2, 'n'); R(bx - 4 + tilt, BY - 9, 8, 3, 'n'); R(bx - 5, BY - 6, 10, 12, 'n'); R(bx - 4 - tilt, BY + 6, 8, 3, 'n');
          R(bx - 3, BY - 5, 6, 10, 't'); R(bx - 2, BY - 4, 4, 3, 'f'); R(bx - 2, BY + 1, 4, 3, 'f'); R(bx - 2, BY - 4, 4, 1, 'N'); R(bx - 2, BY + 1, 4, 1, 'N');
          const oar = Math.floor(t / 250) % 2; R(bx - 11, BY - 1 + oar * 2, 6, 1, 'N'); R(bx + 5, BY - 1 + oar * 2, 6, 1, 'N');
          R(bx - 3, BY + 9, 6, 3, 'w');
        }
        g.fx.forEach(f => txt(f.s, clamp(f.x, 30, 170), BY - 30 - (1 - f.t) * 16, 'y', 1, true, 'k'));
        R(0, 0, LW, 12, 'k');
        txt('HULL', 3, 3, 'C'); R(30, 3, 50, 6, 'd'); R(30, 3, 50 * g.hull / 100, 6, g.hull > 50 ? 'G' : g.hull > 25 ? 'y' : 'R');
        txt('END', 176, 3, 'C'); R(96, 3, 76, 6, 'd'); R(96, 3, 76 * clamp(g.y / cfg.len, 0, 1), 6, 'B');
        if (g.count > 0) { R(50, 100, 100, 26, 'k'); txt(g.count > 0.6 ? 'READY...' : 'GO!', 100, 106, 'y', 2, true); }
        if (g.paused) { R(30, 110, 140, 20, 'k'); txt('PAUSED - PRESS P', 100, 117, 'y', 1, true); }
      }

      /* ---------- gold panning ---------- */
      function panGame(after) {
        stopRun(); music(null);
        const g = G = { type: 'pan', pan: 0, total: 0, parts: [], gold: [], state: 'wash', timer: 0, lastA: null, slosh: 0, results: [], done: false, paused: false, fx: [] };
        const cx = 120, cy = 96;
        const newPan = () => {
          g.pan++; g.state = 'wash'; g.parts = []; g.gold = [];
          for (let i = 0; i < 200; i++) g.parts.push({ r: rnd(4, 58), a: rnd(0, 6.283), c: pick(['n', 'N', 'd', 'l', 't', 'a']), s: rnd(1.5, 4) });
          const r = Math.random(), n = r < 0.15 ? 0 : r < 0.65 ? irnd(1, 3) : r < 0.92 ? irnd(4, 6) : irnd(7, 10);
          for (let i = 0; i < n; i++) g.gold.push({ r: rnd(3, 28), a: rnd(0, 6.283), v: rnd(0.1, 0.8) });
          sfx('click');
        };
        const swirl = d => {
          if (g.state !== 'wash' || g.done) return;
          d = Math.min(Math.abs(d), 0.8);
          g.slosh += d;
          g.parts.forEach(p => { p.a += d; p.r += d * p.s * rnd(0.5, 1.5); });
          const before = g.parts.length;
          g.parts = g.parts.filter(p => p.r < 64);
          if (before - g.parts.length > 0 && opt.sound && Math.random() < 0.5) api.noise(0.08, { ft: 'bandpass', f: 900, vol: 0.03, decay: 1 });
          g.gold.forEach(q => { q.a += d * 0.4; q.r = Math.max(2, q.r - d * 2); });
          if (g.parts.length < 10) {
            g.state = 'reveal'; g.timer = dev.fast ? 0.1 : 1.8;
            const v = g.gold.reduce((a, q) => a + q.v, 0); g.total += v; g.results.push({ n: g.gold.length, v });
            if (g.gold.length) jingle([[79, 0], [84, 0.1], [88, 0.2, 0.3]]); else jingle([[60, 0], [55, 0.15, 0.3]], 'triangle');
          }
        };
        g.btn = (k, down) => { if (down && k === 'swirl') swirl(0.55); };
        g.update = dt => {
          g.slosh *= Math.pow(0.3, dt);
          if (g.state === 'reveal' && (g.timer -= dt) <= 0) { if (g.pan < 3) newPan(); else end(); }
        };
        g.key = (e, down) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) { if (down) swirl(0.4); return true; }
          return false;
        };
        g.pointer = (e, type) => {
          const [x, y] = canvasXY(e), a = Math.atan2(y - cy, x - cx);
          if (type === 'down') { g.lastA = a; g.down = true; return; }
          if (type === 'up') { g.down = false; g.lastA = null; return; }
          if (!g.down && e.pointerType !== 'mouse') return;
          if (g.lastA != null) { let d = a - g.lastA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; if (g.down || e.pointerType === 'mouse') swirl(d * 0.9); }
          g.lastA = a;
        };
        function end() {
          if (g.done) return; g.done = true;
          S.gold = Math.round(g.total * 100) / 100; save();
          show({ art: 'pan', big: true, side: false, size: [240, 180], title: 'Your first gold', html: '<p>' + g.results.map((r, i) => 'Pan ' + (i + 1) + ': ' + (r.n ? plural(r.n, 'flake') + ' of gold, worth ' + money(r.v) : 'nothing but gravel')).join('. ') + '.</p><p>Altogether, <b>' + money(g.total) + '</b> in gold dust. ' + (g.total >= 6 ? 'Not bad at all!' : g.total > 0 ? 'It is a start!' : 'Better luck on your claim!') + '</p>', cont: () => { G = null; after(); } });
        }
        newPan();
        show({ art: 'pan', big: true, side: false, size: [240, 180], title: 'Panning for gold', html: '<p>Swirl the pan to wash the gravel over the rim. Gold is heavy and sinks to the bottom. Drag in circles on the pan, press the arrow keys, or tap the button below.</p><div class="kdk-ctl"><button class="btn" data-g="swirl">Swirl the pan</button></div>', after: bindCtl });
      }
      function panDraw(t) {
        const g = G && G.type === 'pan' ? G : null, cx = 120, cy = 96;
        R(0, 0, LW, LH, 't');
        srand(61); for (let i = 0; i < 90; i++) R(sr() * LW, sr() * LH, 2, 2, pick(['n', 'N', 'l', 'e']));
        R(0, 0, LW, 22, 'b'); for (let i = 0; i < 16; i++) R(((i * 37 + t * 0.03) % 260) - 10, 4 + (i * 7) % 16, 8, 1, 'C');
        for (let dy = -72; dy <= 72; dy++) { const hw = Math.sqrt(72 * 72 - dy * dy); R(cx - hw, cy + dy * 0.9, hw * 2, 1, Math.abs(dy) > 66 ? 'l' : 'd'); }
        for (let dy = -64; dy <= 64; dy++) { const hw = Math.sqrt(64 * 64 - dy * dy); R(cx - hw, cy + dy * 0.9, hw * 2, 1, 'a'); }
        for (let dy = -60; dy <= 60; dy += 1) { const hw = Math.sqrt(60 * 60 - dy * dy); R(cx - hw, cy + dy * 0.9, hw * 2, 1, vga ? '#4878a8' : 'c'); }
        if (g) {
          const s = t / 300 + g.slosh;
          for (let k = 0; k < 18; k++) { const a = s + k * 0.35; R(cx + Math.cos(a) * 54, cy + Math.sin(a) * 48, 3, 1, 'C'); }
          g.gold.forEach((q, i) => { const on = g.state === 'reveal' && Math.floor(t / 150 + i) % 2; R(cx + Math.cos(q.a) * q.r, cy + Math.sin(q.a) * q.r * 0.9, 2, 2, on ? 'w' : 'y'); });
          g.parts.forEach(p => R(cx + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r * 0.9, 2, 2, p.c));
          R(0, 168, LW, 12, 'k');
          txt('PAN ' + g.pan + ' OF 3', 4, 171, 'C'); { const gs = 'GOLD ' + money(g.total); txt(gs, LW - 4 - tw(gs), 171, 'y'); }
          if (g.state === 'reveal') { const r = g.results[g.results.length - 1]; label(r.n ? plural(r.n, 'FLAKE') + '! ' + money(r.v) : 'NO GOLD', cx, 30, r.n ? 'y' : 'l', 'k'); }
        }
      }

      /* ---------- menus and lifecycle ---------- */
      function leaveTo(fn) { stopRun(); G = null; fn(); }
      const backFn = () => (S ? resume : title);
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New game', fn: () => leaveTo(newGame) },
          { label: 'Continue', disabled: !S, fn: () => leaveTo(resume) },
          { label: 'Title screen', fn: () => leaveTo(title) }, '-',
          { label: 'Hall of fame', fn: () => leaveTo(() => hall(backFn())) },
          { label: 'How to play', fn: () => leaveTo(() => howTo(backFn())) }, '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: 'Sound: ' + (opt.sound ? 'On' : 'Off'), fn: () => { opt.sound = !opt.sound; saveOpt(); } },
          { label: 'Music: ' + (opt.music ? 'On' : 'Off'), fn: () => { opt.music = !opt.music; saveOpt(); if (!opt.music) music(null); } }, '-',
          ...['Slow', 'Normal', 'Fast'].map((s, i) => ({ label: (opt.speed === i ? '* ' : '   ') + 'Travel speed: ' + s, fn: () => { opt.speed = i; saveOpt(); } })),
          ...(DEV ? ['-', { label: (dev.fast ? '* ' : '   ') + 'Dev: fast mode', fn: () => { dev.fast = !dev.fast; } },
            { label: 'Dev: tire the party', fn: () => { if (S) here().forEach(m => { m.hp = 2; }); } },
            { label: 'Dev: +$500', fn: () => { if (S) { S.money += 500; save(); status(); } } }] : [])
        ] },
        { label: 'Help', items: [
          { label: 'About the Klondike', fn: () => leaveTo(() => about(backFn())) },
          { label: 'How to play', fn: () => leaveTo(() => howTo(backFn())) },
          { label: 'About Klondike Trail', fn: () => api.msgBox('About Klondike Trail', 'Klondike Trail\nVersion 1.0\n\nNorthern Lights Educational Software, 1990\n\nA journey through the Klondike Gold Rush of 1897-98. The places and events are real history; the people you meet are made up.') }
        ] }
      ]);

      W.onMin = () => {
        if (G && !G.done) G.paused = true;
        if (running) { stopRun(); if (S) resume(); }
      };
      W.onClose = () => { dead = true; stopRun(); cancelAnimationFrame(raf); document.removeEventListener('keyup', keyUp); try { api.stopMusic(); } catch (e) { /* ignore */ } save(); };
      fit();
      title();
      raf = requestAnimationFrame(loop);
      setTimeout(fit, 0);
    }
  });
})();
