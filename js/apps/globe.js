/* Globe Detective: a store game (1995).
   An original geography chase: follow a member of the Sticky Fingers Society around the world
   using clues about flags, money, languages and landmarks, get a warrant, and make the arrest by Sunday 5 pm.
   The game is set in 1995, so money clues use the currencies of that year. */
(function () {
  'use strict';

  /* ---------- cities and clues (all facts checked; the game is set in 1995) ---------- */
  // Each clue: text, or [text, tag]. Clues with a tag are skipped when another destination shares the tag.
  const CITIES = [
    { id: 'paris', name: 'Paris', country: 'France', lat: 48.86, lon: 2.35, loot: 'the smile off a famous painting in the Louvre', clues: [
      'They wanted to ride the elevator to the top of the Eiffel Tower.',
      'They changed their money into French francs.',
      ['They were practicing how to say "bonjour" and "merci".', 'fr'],
      'They asked about boat rides on the River Seine.',
      'They wanted to see the Mona Lisa at the Louvre museum.',
      'Their suitcase had a flag with blue, white and red vertical stripes.',
      'They said they were hungry for fresh croissants.'] },
    { id: 'london', name: 'London', country: 'United Kingdom', lat: 51.51, lon: -0.13, loot: 'the BONG from Big Ben', clues: [
      'They wanted to hear the famous bell called Big Ben.',
      'They changed their money into British pounds.',
      'They asked how to get to Buckingham Palace to see the guards.',
      'They wanted a ride on a red double-decker bus.',
      'They asked about boat trips on the River Thames.',
      'Their suitcase had a flag with red and white crosses on a blue background.',
      'They wanted to walk across Tower Bridge.'] },
    { id: 'rome', name: 'Rome', country: 'Italy', lat: 41.9, lon: 12.5, loot: 'every wish from the Trevi Fountain', clues: [
      'They wanted to see where gladiators fought, in the Colosseum.',
      'They changed their money into Italian lire.',
      'They wanted to toss a coin into the Trevi Fountain.',
      'They asked for directions to Vatican City.',
      'They were practicing a little Italian: "ciao" and "grazie".',
      'They asked about walks along the River Tiber.',
      'They said they could not wait to eat real Italian pasta.'] },
    { id: 'madrid', name: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.7, loot: 'the frames from every painting in the Prado', clues: [
      'They changed their money into Spanish pesetas.',
      'They wanted to visit the Prado, a famous art museum.',
      'Their suitcase had a flag with red and yellow stripes.',
      'They wanted to visit the capital city right in the middle of Spain.',
      'They were hungry for paella and tapas.',
      'They wanted to watch flamenco dancing.',
      ['They were practicing their Spanish.', 'es']] },
    { id: 'berlin', name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.4, loot: 'the gate from the Brandenburg Gate', clues: [
      'They wanted to walk through the Brandenburg Gate.',
      'They changed their money into German marks.',
      'Their suitcase had a flag with black, red and gold stripes.',
      'They were practicing German: "guten Tag" and "danke".',
      'They wanted to see where the famous Wall came down in 1989.',
      'They asked about boat rides on the River Spree.',
      'They said they wanted a giant soft pretzel.'] },
    { id: 'moscow', name: 'Moscow', country: 'Russia', lat: 55.76, lon: 37.62, loot: 'the stripes off the onion domes of St. Basil\'s Cathedral', clues: [
      'They wanted to see the colorful onion domes of St. Basil\'s Cathedral.',
      'They changed their money into Russian rubles.',
      'They asked for directions to Red Square and the Kremlin.',
      'They were trying to read a map written in the Cyrillic alphabet.',
      'Their suitcase had a flag with white, blue and red stripes.',
      'They wanted tickets to the Bolshoi Ballet.',
      'They asked if the Moskva River freezes in winter.'] },
    { id: 'cairo', name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24, loot: 'the riddle of the Great Sphinx', clues: [
      'They wanted to see the Great Pyramids of Giza.',
      'They changed their money into Egyptian pounds.',
      'They asked about a boat ride on the Nile, the longest river in Africa.',
      'They wanted a picture with the Great Sphinx.',
      ['They were practicing a few words of Arabic.', 'ar'],
      'Their suitcase had a flag with red, white and black stripes and a golden eagle.',
      'They wanted to see King Tut\'s treasures at the Egyptian Museum.'] },
    { id: 'nairobi', name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82, loot: 'the roar from every lion in the national park', clues: [
      'They wanted to see lions and giraffes in a national park right next to the city.',
      'They changed their money into Kenyan shillings.',
      'They were learning Swahili. "Jambo" means hello!',
      'They wanted to go on safari. "Safari" means "journey" in Swahili.',
      'Their suitcase had a flag with black, red and green stripes and a shield with two spears.',
      'They wanted to see Mount Kenya, the second-highest mountain in Africa.',
      'They wanted to cheer for the country\'s famous long-distance runners.'] },
    { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69, loot: 'the orange paint off Tokyo Tower', clues: [
      'They changed their money into Japanese yen.',
      'They hoped to see snowy Mount Fuji on a clear day.',
      'Their suitcase had a flag with a red circle on a white background.',
      'They wanted to ride a super-fast bullet train.',
      'They were practicing Japanese. "Konnichiwa" means hello!',
      'They said they were hungry for sushi.',
      'They wanted to climb the orange-and-white Tokyo Tower.'] },
    { id: 'beijing', name: 'Beijing', country: 'China', lat: 39.9, lon: 116.4, loot: 'a whole mile of the Great Wall', clues: [
      'They wanted to walk on the Great Wall.',
      'They changed their money into Chinese yuan.',
      'They wanted to explore the Forbidden City, where emperors once lived.',
      'Their suitcase had a red flag with five yellow stars.',
      'They were practicing Mandarin Chinese.',
      'They said they were hungry for Peking duck.',
      'They wanted to see giant pandas at the zoo.'] },
    { id: 'delhi', name: 'New Delhi', country: 'India', lat: 28.61, lon: 77.21, loot: 'the arch from India Gate', clues: [
      'They changed their money into Indian rupees.',
      'Their suitcase had a flag with orange, white and green stripes and a blue wheel.',
      'They wanted to see the Red Fort.',
      'They were practicing a few words of Hindi.',
      'They asked how far it is to the Taj Mahal.',
      'They wanted to walk to India Gate.',
      'They were hungry for spicy curry and naan bread.'] },
    { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21, loot: 'the sails off the Opera House roof', clues: [
      'They wanted to see a show at the Opera House with the roof shaped like sails.',
      'They changed their money into Australian dollars.',
      'They wanted to walk across the Harbour Bridge.',
      'They hoped to see a kangaroo and a koala.',
      'Their suitcase had a flag with the Union Jack and the stars of the Southern Cross.',
      'They wanted to go surfing at Bondi Beach.',
      'They asked about snorkeling on the Great Barrier Reef.'] },
    { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil', lat: -22.91, lon: -43.17, loot: 'the sugar from Sugarloaf Mountain', clues: [
      'They wanted to see the giant statue of Christ the Redeemer.',
      'They wanted to ride the cable car up Sugarloaf Mountain.',
      'They were practicing Portuguese.',
      'They wanted to dance the samba at Carnival.',
      'Their suitcase had a green flag with a yellow diamond and a blue globe.',
      'They wanted to relax on Copacabana beach.',
      'They asked about trips to the Amazon rainforest.'] },
    { id: 'buenos', name: 'Buenos Aires', country: 'Argentina', lat: -34.6, lon: -58.38, loot: 'the last step of the tango', clues: [
      'They wanted to learn to dance the tango.',
      'Their suitcase had a flag with light blue and white stripes and a golden sun.',
      'They wanted to see the tall white Obelisk.',
      'They asked about the Avenida 9 de Julio, one of the widest avenues in the world.',
      ['They were practicing their Spanish.', 'es'],
      'They wanted to meet the gauchos, the cowboys of the pampas.',
      'They asked about the wide Rio de la Plata.'] },
    { id: 'mexico', name: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13, loot: 'the top step of the Pyramid of the Sun', clues: [
      'They changed their money into Mexican pesos.',
      'Their suitcase had a flag with an eagle eating a snake on a cactus.',
      'They wanted to climb the Pyramid of the Sun at Teotihuacan.',
      ['They were practicing their Spanish.', 'es'],
      'They wanted to see where the Aztec city of Tenochtitlan once stood.',
      'They said they were hungry for tacos.',
      'They wanted to hear a mariachi band.'] },
    { id: 'newyork', name: 'New York', country: 'United States', lat: 40.71, lon: -74.0, loot: 'the torch from the Statue of Liberty', clues: [
      'They wanted to visit the Statue of Liberty.',
      'They changed their money into US dollars.',
      'They wanted to go up the Empire State Building.',
      'They asked about a stroll through Central Park.',
      'Their suitcase had a flag with 50 stars and 13 stripes.',
      'They kept calling the city "the Big Apple".',
      'They asked about ferries on the Hudson River.'] },
    { id: 'toronto', name: 'Toronto', country: 'Canada', lat: 43.65, lon: -79.38, loot: 'the elevator from the CN Tower', clues: [
      'They wanted to go up the CN Tower, one of the tallest towers in the world.',
      'They changed their money into Canadian dollars.',
      'Their suitcase had a red and white flag with a maple leaf.',
      'They asked about a day trip to Niagara Falls.',
      'They wanted to go sailing on Lake Ontario.',
      'They wanted tickets to an ice hockey game.',
      ['They were practicing English and French, the two official languages of the country.', 'fr']] },
    { id: 'athens', name: 'Athens', country: 'Greece', lat: 37.98, lon: 23.73, loot: 'the columns of the Parthenon', clues: [
      'They wanted to see the Parthenon on top of the Acropolis.',
      'They changed their money into Greek drachmas.',
      'Their suitcase had a flag with blue and white stripes and a white cross.',
      'They were practicing the Greek alphabet: alpha, beta, gamma.',
      'They asked where the first modern Olympic Games were held in 1896.',
      'They said they were hungry for olives and feta cheese.',
      'They were reading myths about Athena, the goddess the city is named after.'] },
    { id: 'istanbul', name: 'Istanbul', country: 'Turkey', lat: 41.01, lon: 28.98, loot: 'a whole corner of the Grand Bazaar', clues: [
      'They wanted to visit Hagia Sophia and the Blue Mosque.',
      'They wanted a boat ride on the Bosphorus, between Europe and Asia.',
      'They wanted to go shopping in the Grand Bazaar.',
      'Their suitcase had a red flag with a white crescent moon and a star.',
      'They were practicing Turkish.',
      'They mentioned that the city used to be called Constantinople.',
      'They said they were hungry for kebabs and Turkish delight.'] },
    { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', lat: 52.37, lon: 4.9, loot: 'the water from a canal', clues: [
      'They wanted a boat ride along the canals.',
      'They changed their money into Dutch guilders.',
      'They were looking for fields of tulips.',
      'Their suitcase had a flag with just three stripes, red, white and blue, one above the other.',
      'They wanted to see the paintings in the Van Gogh Museum.',
      'They were practicing Dutch.',
      'They wanted to rent a bicycle, like almost everybody in town.'] },
    { id: 'stockholm', name: 'Stockholm', country: 'Sweden', lat: 59.33, lon: 18.07, loot: 'the anchor of the old warship Vasa', clues: [
      'They changed their money into Swedish kronor.',
      'Their suitcase had a blue flag with a yellow cross.',
      'They wanted to see the old warship Vasa in its museum.',
      'They asked where most of the Nobel Prizes are handed out.',
      'They wanted to hop between the islands the city is built on.',
      'They were practicing Swedish.',
      'They were hungry for meatballs with lingonberries.'] },
    { id: 'bangkok', name: 'Bangkok', country: 'Thailand', lat: 13.76, lon: 100.5, loot: 'the glitter from the Grand Palace', clues: [
      'They changed their money into Thai baht.',
      'They wanted to visit the glittering Grand Palace.',
      'They wanted to go shopping at a floating market.',
      'Their suitcase had a flag with red, white and blue stripes, with a wide blue stripe in the middle.',
      'They were practicing Thai.',
      'They asked about boat rides on the Chao Phraya River.',
      'They wanted to ride a three-wheeled tuk-tuk.'] },
    { id: 'lima', name: 'Lima', country: 'Peru', lat: -12.05, lon: -77.04, loot: 'the fluff off every alpaca in town', clues: [
      'They wanted to hike to the ancient Inca city of Machu Picchu.',
      'Their suitcase had a flag with red, white and red vertical stripes and no picture in the middle.',
      ['They were practicing Spanish and a little Quechua.', 'es'],
      'They wanted to see llamas and alpacas in the Andes mountains.',
      'They asked about Lake Titicaca, high up in the mountains.',
      'They wanted to watch the Pacific Ocean from the cliffs at the edge of the city.',
      'They were reading a book about the Inca Empire.'] },
    { id: 'capetown', name: 'Cape Town', country: 'South Africa', lat: -33.92, lon: 18.42, loot: 'the tablecloth off Table Mountain', clues: [
      'They wanted to ride the cable car up flat-topped Table Mountain.',
      'They changed their money into South African rand.',
      'They wanted to see the penguins that live on a beach near the city.',
      'They asked about the Cape of Good Hope.',
      'Their suitcase had a flag with six colors and a sideways Y shape.',
      'They said the country has eleven official languages.',
      'They wanted to go whale watching along the coast.'] },
    { id: 'reykjavik', name: 'Reykjavik', country: 'Iceland', lat: 64.15, lon: -21.94, loot: 'the steam from a geyser', clues: [
      'They changed their money into Icelandic kronur.',
      'Their suitcase had a blue flag with a red cross outlined in white.',
      'They wanted to see a geyser shoot hot water into the sky.',
      'They hoped to see the northern lights.',
      'They were practicing Icelandic, a language very close to Old Norse.',
      'They wanted to see puffins, volcanoes and glaciers.',
      'They wanted to visit the northernmost capital city of any country.'] },
    { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', lat: 27.72, lon: 85.32, loot: 'the top step of the temple with the painted eyes', clues: [
      'They wanted to see Mount Everest, the highest mountain on Earth.',
      'Their suitcase had a flag shaped like two triangles instead of a rectangle.',
      'They changed their money into Nepalese rupees.',
      'They wanted to hike in the Himalayas with a Sherpa guide.',
      'They were practicing Nepali. "Namaste" means hello!',
      'They wanted to visit a temple with big painted eyes on its tower.',
      'They said they were hungry for momo dumplings.'] },
    { id: 'marrakesh', name: 'Marrakesh', country: 'Morocco', lat: 31.63, lon: -7.99, loot: 'the tunes of the snake charmers', clues: [
      'They changed their money into Moroccan dirhams.',
      'Their suitcase had a red flag with a green star.',
      'They wanted to see the snake charmers and storytellers in the big main square.',
      'They asked about the snowy Atlas Mountains nearby.',
      ['They were practicing a few words of Arabic.', 'ar'],
      'They said they were hungry for couscous and tagine.',
      'They wanted to see the tall Koutoubia minaret.'] }
  ];
  const CITY = Object.fromEntries(CITIES.map(c => [c.id, c]));

  /* ---------- the Sticky Fingers Society ---------- */
  const TRAITS = [
    { k: 'hair', label: 'Hair', vals: ['Red', 'Black', 'Blond', 'Silver'] },
    { k: 'hobby', label: 'Hobby', vals: ['Juggling', 'Knitting', 'Yo-yo', 'Opera singing', 'Tap dancing'] },
    { k: 'ride', label: 'Vehicle', vals: ['Scooter', 'Hot-air balloon', 'Motorcycle', 'Limousine'] },
    { k: 'look', label: 'Feature', vals: ['Monocle', 'Freckles', 'Bow tie', 'Big boots', 'Polka-dot scarf'] }
  ];
  const SAY = {
    hair: { Red: 'had bright red hair', Black: 'had jet-black hair', Blond: 'had blond hair', Silver: 'had silver hair' },
    hobby: { Juggling: 'kept juggling oranges the whole time', Knitting: 'was knitting a very, very long scarf', 'Yo-yo': 'kept doing yo-yo tricks', 'Opera singing': 'was humming opera songs, loudly', 'Tap dancing': 'was tap dancing while they waited' },
    ride: { Scooter: 'mentioned a trusty little scooter', 'Hot-air balloon': 'talked about flying a hot-air balloon', Motorcycle: 'was carrying a motorcycle helmet', Limousine: 'said a limousine was waiting for them' },
    look: { Monocle: 'wore a shiny monocle', Freckles: 'had lots and lots of freckles', 'Bow tie': 'wore a spotted bow tie', 'Big boots': 'wore enormous boots', 'Polka-dot scarf': 'wore a polka-dot scarf' }
  };
  const CROOKS = [
    { name: 'Lady Sticklebrick', hair: 'Silver', hobby: 'Knitting', ride: 'Limousine', look: 'Monocle', bio: 'Says she only "borrows" things. Has never returned anything.' },
    { name: 'Pickpocket Pete', hair: 'Red', hobby: 'Yo-yo', ride: 'Scooter', look: 'Freckles', bio: 'Can take your watch and tell you the time with it.' },
    { name: 'Madame Mischief', hair: 'Black', hobby: 'Opera singing', ride: 'Hot-air balloon', look: 'Polka-dot scarf', bio: 'Her high notes can shatter a museum display case.' },
    { name: 'Baron Von Borrow', hair: 'Silver', hobby: 'Opera singing', ride: 'Limousine', look: 'Bow tie', bio: 'Collects famous things. Mostly other people\'s.' },
    { name: 'Dizzy Dora Doodle', hair: 'Blond', hobby: 'Juggling', ride: 'Scooter', look: 'Big boots', bio: 'Once juggled three stolen crown jewels on a unicycle.' },
    { name: 'Slick Nick Nabbit', hair: 'Black', hobby: 'Tap dancing', ride: 'Motorcycle', look: 'Bow tie', bio: 'Tap dances so fast that the alarms cannot keep up.' },
    { name: 'Penny Pilfer', hair: 'Red', hobby: 'Knitting', ride: 'Hot-air balloon', look: 'Freckles', bio: 'Knits her own disguises. They are all a little lumpy.' },
    { name: 'Sneaky Sal Swindle', hair: 'Blond', hobby: 'Tap dancing', ride: 'Motorcycle', look: 'Polka-dot scarf', bio: 'Has 400 polka-dot scarves. Nobody knows why.' },
    { name: 'Grabby Gus Grabbins', hair: 'Black', hobby: 'Juggling', ride: 'Limousine', look: 'Big boots', bio: 'Leaves giant boot prints everywhere he goes.' },
    { name: 'Countess Klepto', hair: 'Blond', hobby: 'Yo-yo', ride: 'Hot-air balloon', look: 'Monocle', bio: 'Uses her yo-yo to snatch things from high shelves.' }
  ];
  const HAIRC = { Red: '#e04020', Black: '#181818', Blond: '#f0d040', Silver: '#c8c8d0' };
  const RANKS = [[0, 'Rookie'], [1, 'Gumshoe'], [3, 'Sleuth'], [6, 'Inspector'], [10, 'Super Sleuth'], [15, 'Globe Master']];
  const rankFor = n => { let r = RANKS[0][1]; RANKS.forEach(([k, t]) => { if (n >= k) r = t; }); return r; };
  const nextRank = n => { const x = RANKS.find(([k]) => k > n); return x ? x : null; };
  const PLACES = [['Airport', 'the ticket agent'], ['Museum', 'the museum guide'], ['Market', 'a fruit seller'], ['Hotel', 'the desk clerk'], ['Library', 'the librarian'],
    ['Bank', 'the bank teller'], ['Train Station', 'the conductor'], ['Park', 'a jogger'], ['Cafe', 'the waiter'], ['Post Office', 'the mail carrier']];
  const NOBODY = ['Sorry, detective. Nobody like that has been through here.', 'Hmm? No, I have not seen anyone suspicious today.', 'Nobody here has seen anyone like that. Maybe you took a wrong turn?',
    'I see a lot of people, but nobody matching that description.', 'No idea, detective. It has been a very quiet day.', 'Sorry, nobody here has seen them.'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const START_H = 9, DEADLINE = 6 * 24 + 17; // Monday 9 am to Sunday 5 pm

  /* ---------- pixel helpers ---------- */
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    '.': '000000000000010', '-': '000000111000000', '!': '010010010000010', '?': '110001010000010', "'": '010010000000000', ':': '000010000010000', '>': '100010001010100'
  };
  // A coarse world map, 10 degree cells: [row (0 = 80..90N), fromCol, toCol], col 0 = 180W.
  const LAND = [[0, 13, 15], [1, 7, 11], [1, 12, 16], [1, 25, 33], [2, 1, 11], [2, 13, 16], [2, 19, 35], [3, 3, 8], [3, 10, 12], [3, 17, 17], [3, 18, 33], [3, 34, 34],
    [4, 6, 12], [4, 17, 32], [5, 6, 10], [5, 17, 32], [6, 7, 9], [6, 16, 27], [6, 28, 31], [7, 8, 10], [7, 16, 23], [7, 25, 26], [7, 27, 29], [7, 30, 30],
    [8, 10, 13], [8, 17, 23], [8, 28, 30], [9, 10, 14], [9, 19, 22], [9, 28, 33], [10, 11, 14], [10, 19, 22], [10, 30, 32], [11, 11, 13], [11, 19, 22], [11, 29, 33],
    [12, 11, 12], [12, 19, 20], [12, 29, 32], [12, 35, 35], [13, 11, 12], [13, 32, 32], [13, 34, 35], [14, 10, 11], [15, 0, 2], [15, 14, 16], [15, 22, 30], [16, 0, 35], [17, 0, 35]];
  const LANDSET = new Set(); LAND.forEach(([r, a, b]) => { for (let c = a; c <= b; c++) LANDSET.add(r * 36 + c); });

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="#2a5ad8" stroke="#000"/><path d="M8 8h5v3h3v4h-4v5h-3v-4H6v-5h2z" fill="#3cb04a"/><path d="M17 6h4v3h3v5h-3v-2h-4z" fill="#3cb04a"/><path d="M15 18h4v4h-3v2h-2z" fill="#3cb04a"/><rect x="21" y="21" width="4" height="4" fill="#000" transform="rotate(45 23 23)"/><rect x="23" y="24" width="3" height="8" fill="#8a4a1a" stroke="#000" transform="rotate(-45 24 28)"/><circle cx="14" cy="14" r="11" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><circle cx="14" cy="14" r="12" fill="none" stroke="#000"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'globe',
    label: 'Globe Detective',
    kind: 'store',
    cat: 'game',
    year: 1995,
    price: 29.95,
    publisher: 'Compass Rose Interactive',
    genre: 'Geography / Mystery',
    tagline: 'The whole world is your crime scene.',
    blurb: 'The Sticky Fingers Society is at it again! Somebody has stolen the smile off a famous painting, and that is just the start. Chase clever crooks through 27 cities on six continents using real clues about flags, money, languages and landmarks. Use the Crime Computer to get a warrant and make the arrest before Sunday at 5 pm. Rise from Rookie to Globe Master!',
    sizeKB: 4800,
    box: { bg: '#7a1010', fg: '#ffffff', accent: '#ffcc00' },
    icon: ICON,
    window: { w: 640, h: 560 },
    css: `
      .gdt{position:absolute;inset:0;display:flex;flex-direction:column;gap:4px;padding:4px;background:var(--gray,#c0c0c0);font:13px/1.35 var(--ui);box-sizing:border-box}
      .gdt-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 8px;background:#000080;color:#fff;flex:none}
      .gdt-top b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .gdt-top small{display:block;font-size:11px;color:#c0c0ff}
      .gdt-clock{font:20px/1 var(--dos);color:#55ff55;background:#000;padding:2px 6px;border:2px solid;border-color:#404040 #fff #fff #404040;white-space:nowrap}
      .gdt-scn{flex:none;background:#000;display:flex;justify-content:center;padding:2px 0}
      .gdt-scn canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:manipulation}
      .gdt-txt{flex:1;min-height:60px;overflow:auto;background:#fff;padding:6px 8px;user-select:text}
      .gdt-txt p{margin:0 0 6px}
      .gdt-txt h3{margin:0 0 4px;font-size:14px;color:#000080}
      .gdt-q{font-style:italic}
      .gdt-who{color:#800000;font-weight:700}
      .gdt-note{color:#006000}
      .gdt-warn{color:#a00000;font-weight:700}
      .gdt-acts{flex:none;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
      .gdt-acts.gdt-a2{grid-template-columns:repeat(2,1fr)}
      .gdt-acts.gdt-a3{grid-template-columns:repeat(3,1fr)}
      .gdt-acts .btn{min-width:0;padding:5px 4px;display:flex;align-items:center;justify-content:center;gap:5px;font:13px var(--ui);line-height:1.15;min-height:34px}
      .gdt-acts .btn:active{padding:6px 3px 4px 5px}
      .gdt-acts .btn svg{width:18px;height:18px;flex:none}
      .gdt-acts .btn u{text-decoration:underline}
      .gdt-acts .btn small{display:block;color:#404040;font-size:11px}
      .gdt-acts .btn span{text-align:left}
      .gdt-cc{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;max-width:360px;margin:4px 0 6px}
      .gdt-cc select{font:13px var(--ui);min-width:0}
      .gdt-list{margin:0;padding-left:18px}
      .gdt-list li{margin-bottom:2px}
      .gdt-dos{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px}
      .gdt-dos div{border:1px solid #808080;padding:4px 6px;background:#ffffe8}
      .gdt-dos b{display:block;color:#000080}
      .gdt-in{font:14px var(--ui);padding:2px 4px;width:180px;max-width:100%}
      .gdt-sm .gdt-acts{grid-template-columns:repeat(2,1fr)}
      .gdt-sm .gdt-top b{font-size:14px}
      .gdt-sm .gdt-clock{font-size:17px}
    `,
    open(W, api) {
      const esc = api.esc;
      let prof = api.load('profile', null) || { name: (api.user || 'Detective').slice(0, 14), solved: 0 };
      let C = api.load('case', null);
      if (C && (!C.trail || !CROOKS[C.crook])) C = null;
      let sound = api.load('sound', true);
      const LW = 256, LH = 120;
      let scene = { name: 'title' }, raf = 0, dead = false, keys = {};

      W.body.innerHTML = '<div class="gdt"><div class="gdt-top"><div style="min-width:0"><b></b><small></small></div><div class="gdt-clock"></div></div><div class="gdt-scn"><canvas width="256" height="120"></canvas></div><div class="gdt-txt" aria-live="polite"></div><div class="gdt-acts"></div></div>';
      const root = W.body.firstChild, cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
      const topB = root.querySelector('.gdt-top b'), topS = root.querySelector('.gdt-top small'), clockEl = root.querySelector('.gdt-clock');
      const txtEl = root.querySelector('.gdt-txt'), actsEl = root.querySelector('.gdt-acts');
      const globeBuf = document.createElement('canvas'); globeBuf.width = 80; globeBuf.height = 80;
      const gctx = globeBuf.getContext('2d'), gimg = gctx.createImageData(80, 80);

      /* ---------- sound ---------- */
      const tone = (f, d = 0.08, o = {}) => { if (sound) api.tone(f, d, Object.assign({ type: 'square', vol: 0.05 }, o)); };
      const jingle = (notes, type = 'square') => { if (sound) notes.forEach(([n, at, d]) => api.tone(api.midi(n), d || 0.14, { type, vol: 0.05, at })); };
      const sfx = n => { if (sound && api.sfx[n]) api.sfx[n](); };

      /* ---------- helpers ---------- */
      const rnd = n => Math.floor(Math.random() * n);
      const pick = a => a[rnd(a.length)];
      const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const clueText = c => Array.isArray(c) ? c[0] : c;
      const clueTag = c => Array.isArray(c) ? c[1] : null;
      function km(a, b) {
        const r = Math.PI / 180, dlat = (b.lat - a.lat) * r, dlon = (b.lon - a.lon) * r;
        const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
        return 6371 * 2 * Math.asin(Math.sqrt(h));
      }
      const flightH = (a, b) => Math.max(2, Math.round(1 + km(CITY[a], CITY[b]) / 1100));
      function clock(t) {
        const d = Math.floor(t / 24), h = t % 24, hh = h % 12 === 0 ? 12 : h % 12;
        return DAYS[Math.min(6, d)] + ' ' + hh + ':00 ' + (h < 12 ? 'am' : 'pm');
      }
      const save = () => { api.save('case', C); api.save('profile', prof); };
      const rank = () => rankFor(prof.solved);

      /* ---------- drawing ---------- */
      function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
      const tw = (s, k = 1) => s.length * 4 * k - k;
      function txt(str, x, y, c, k = 1, center, shadow) {
        str = String(str).toUpperCase();
        if (center) x = Math.round(x - tw(str, k) / 2);
        if (shadow) txt(str, x + k, y + k, shadow, k);
        for (let i = 0; i < str.length; i++) { const g = FONT[str[i]]; if (g) for (let b = 0; b < 15; b++) if (g[b] === '1') R(x + i * 4 * k + (b % 3) * k, y + Math.floor(b / 3) * k, k, k, c); }
      }
      function tri(cx, top, bot, hw, c) { for (let y = top; y <= bot; y++) { const w = hw * (y - top) / Math.max(1, bot - top); R(cx - w, y, w * 2 + 1, 1, c); } }
      function dome(cx, base, r, c) { for (let dy = 0; dy <= r; dy++) { const w = Math.sqrt(r * r - dy * dy); R(cx - w, base - dy, w * 2, 1, c); } }
      function circ(cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const w = Math.sqrt(r * r - dy * dy); R(cx - w, cy + dy, w * 2, 1, c); } }
      function onion(cx, base, r, c1, c2) { for (let dy = -r; dy <= r; dy++) { const w = Math.sqrt(r * r - dy * dy); R(cx - w, base - r + dy, w * 2, 1, (Math.floor((dy + r) / 3) % 2) ? c1 : c2); } tri(cx, base - 2 * r - 8, base - 2 * r + 1, r * 0.5, c1); }
      let seed = 1;
      const sr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const hourNow = () => C ? C.time % 24 : 12;
      function sky(t, warm) {
        const h = hourNow(), night = h < 6 || h >= 20, dusk = !night && (h < 8 || h >= 18);
        const cols = night ? ['#000018', '#00002a', '#08083c', '#101850'] : dusk ? ['#402060', '#a04060', '#f07040', '#ffb060'] : warm ? ['#f0a040', '#f8c060', '#ffd880', '#ffe8b0'] : ['#3060d0', '#4078e8', '#60a0ff', '#98c8ff'];
        cols.forEach((c, i) => R(0, i * 25, LW, 26, c));
        if (night) { seed = 9; for (let i = 0; i < 40; i++) R(sr() * LW, sr() * 70, 1, 1, Math.sin(t / 500 + i) > 0.5 ? '#fff' : '#889'); R(210, 12, 10, 10, '#ffffe0'); R(214, 10, 8, 10, cols[0]); }
        else if (!dusk) { R(214, 10, 12, 12, '#ffff60'); R(212, 12, 16, 8, '#ffff60'); }
        return night;
      }
      function skyline(n, col, maxH = 40, lit) {
        seed = n * 31 + 7; const night = hourNow() < 6 || hourNow() >= 20;
        for (let x = -4; x < LW;) { const w = 10 + Math.floor(sr() * 16), h = 12 + Math.floor(sr() * maxH); R(x, 100 - h, w, h, col); if (lit !== false) for (let y = 104 - h; y < 96; y += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (sr() < (night ? 0.5 : 0.25)) R(xx, y, 2, 2, night ? '#ffe070' : '#9ab'); x += w + 1 + Math.floor(sr() * 6); }
      }
      const ground = (c, y = 100) => R(0, y, LW, LH - y, c);
      function water(t, y = 100, c = '#2050c0', c2 = '#60a0ff') { R(0, y, LW, LH - y, c); for (let i = 0; i < 22; i++) { const x = ((i * 47 + t * 0.02 * (1 + i % 3)) % (LW + 20)) - 10; R(x, y + 3 + (i * 7) % (LH - y - 4), 7, 1, c2); } }
      function palm(x, base) { R(x, base - 26, 3, 26, '#8a5a2a'); [[-10, 0], [-6, -3], [4, -3], [8, 0]].forEach(([dx, dy]) => R(x + dx, base - 28 + dy, 8, 3, '#2a8a3a')); R(x - 3, base - 31, 9, 3, '#2a8a3a'); }
      function mountains(peaks, c, snow) { peaks.forEach(([x, top, hw]) => { tri(x, top, 100, hw, c); if (snow) tri(x, top, top + (100 - top) * 0.25, hw * 0.25, '#fff'); }); }

      const ART = {
        paris(t) { sky(t); skyline(1, '#8a8aa0', 26); ground('#4a8a3a'); R(0, 104, LW, 8, '#3060b0');
          const cx = 150, col = '#6a5238';
          for (let y = 16; y <= 100; y++) { const f = (y - 16) / 84, hw = 1 + f * f * 30; R(cx - hw, y, 3, 1, col); R(cx + hw - 2, y, 3, 1, col); if (y % 5 === 0 && y < 88) R(cx - hw, y, hw * 2, 1, col); if (y > 88) { const aw = (y - 88) * 1.6; R(cx - hw + 2, y, hw - aw - 2, 1, col); R(cx + aw, y, hw - aw - 2, 1, col); } }
          R(cx - 9, 56, 18, 3, col); R(cx - 16, 78, 32, 3, col); R(cx - 1, 8, 2, 8, col); },
        london(t) { sky(t); skyline(2, '#707888', 22); water(t, 100);
          R(84, 32, 16, 70, '#c8a868'); R(82, 30, 20, 4, '#b08850'); tri(92, 10, 30, 10, '#505040'); R(91, 4, 2, 7, '#505040');
          R(86, 36, 12, 12, '#fff'); R(91, 38, 2, 5, '#000'); R(91, 42, 5, 1, '#000'); for (let i = 0; i < 4; i++) R(86 + i * 3, 52 + i * 0, 1, 40, '#a08040');
          R(100, 66, 120, 34, '#c8a868'); for (let x = 102; x < 218; x += 6) { R(x, 62, 2, 4, '#b08850'); R(x, 72, 2, 22, '#a08040'); }
          R(20, 84, 34, 17, '#d02020'); R(22, 86, 30, 4, '#a0d0ff'); R(22, 93, 30, 3, '#a0d0ff'); R(24, 100, 5, 4, '#000'); R(44, 100, 5, 4, '#000'); },
        rome(t) { sky(t); skyline(3, '#b09070', 18); ground('#b0a080');
          const c = '#d0a870', d = '#7a5a3a';
          R(40, 50, 176, 50, c);
          for (let tier = 0; tier < 3; tier++) { const y0 = 54 + tier * 15; for (let x = 44; x < 212; x += 11) { if (tier === 0 && x > 170) continue; R(x + 2, y0 + 3, 6, 9, d); R(x + 3, y0 + 2, 4, 1, d); } }
          R(40, 50, 176, 2, '#b08850'); R(176, 40, 40, 10, c); R(194, 30, 22, 10, c); for (let x = 180; x < 214; x += 11) R(x + 2, 42, 6, 7, d); R(40, 98, 176, 2, '#a07850'); },
        madrid(t) { sky(t); ground('#c8b890');
          const c = '#efe8d8'; R(24, 54, 208, 46, c); R(20, 50, 216, 5, '#d8d0c0'); R(110, 36, 36, 18, c); dome(128, 36, 12, '#8090a0');
          for (let x = 30; x < 228; x += 10) { R(x, 60, 4, 8, '#405070'); R(x, 74, 4, 10, '#405070'); R(x + 6, 56, 2, 44, '#d8d0c0'); }
          R(120, 86, 16, 14, '#805030'); },
        berlin(t) { sky(t); skyline(5, '#8890a0', 20); ground('#9a9a8a');
          const c = '#d8cca8'; R(62, 42, 132, 14, c); R(58, 40, 140, 3, '#c0b490'); R(96, 32, 64, 10, c);
          for (let i = 0; i < 6; i++) R(66 + i * 24, 56, 8, 44, c);
          R(116, 22, 24, 10, '#3a8a6a'); R(112, 26, 4, 6, '#3a8a6a'); R(140, 26, 4, 6, '#3a8a6a'); R(126, 16, 4, 6, '#3a8a6a'); },
        moscow(t) { sky(t); ground('#a0a0a0');
          R(0, 80, 256, 20, '#a82020'); for (let x = 0; x < LW; x += 8) R(x, 76, 5, 4, '#a82020');
          R(118, 40, 20, 60, '#c83030'); tri(128, 8, 40, 10, '#40a040'); R(127, 2, 2, 7, '#e0c040');
          [[82, 70, 9, '#2080e0', '#f0f0f0'], [104, 62, 10, '#e0c040', '#40a040'], [152, 62, 10, '#e04040', '#f0f0f0'], [174, 70, 9, '#40a040', '#e0c040']].forEach(([x, b, r, a, bb]) => { R(x - r + 2, b, r * 2 - 4, 100 - b, '#c85030'); onion(x, b, r, a, bb); });
          for (let x = 80; x < 180; x += 7) R(x, 86, 3, 6, '#f0e0c0'); },
        cairo(t) { sky(t, true); ground('#e0c070', 96);
          [[70, 26, 60], [160, 44, 46], [214, 64, 26]].forEach(([x, top, hw]) => { tri(x, top, 100, hw, '#d8b060'); for (let y = top; y <= 100; y++) { const w = hw * (y - top) / (100 - top); R(x, y, w, 1, '#b89040'); } });
          R(10, 88, 34, 12, '#c8a050'); R(34, 80, 12, 10, '#c8a050'); R(36, 82, 2, 2, '#6a4a20'); palm(236, 100); },
        nairobi(t) { sky(t, true); skyline(8, '#606878', 44); ground('#b8b050', 96);
          R(52, 70, 4, 30, '#6a4020'); R(30, 64, 48, 6, '#3a7a2a'); R(36, 60, 36, 4, '#3a7a2a');
          const gx = 160; R(gx, 76, 26, 12, '#e0a040'); R(gx + 22, 44, 5, 34, '#e0a040'); R(gx + 22, 40, 10, 6, '#e0a040'); R(gx + 29, 42, 1, 1, '#000');
          [[0, 88], [5, 88], [18, 88], [23, 88]].forEach(([dx, y]) => R(gx + dx, y, 3, 12, '#e0a040')); for (let i = 0; i < 9; i++) R(gx + 2 + (i * 7) % 22, 77 + (i * 3) % 9, 3, 3, '#8a5020'); R(gx + 23, 50, 2, 2, '#8a5020'); R(gx + 24, 62, 2, 2, '#8a5020'); },
        tokyo(t) { sky(t); tri(62, 30, 100, 70, '#6a7aa8'); tri(62, 30, 46, 16, '#fff'); skyline(9, '#7880a0', 30); ground('#8a8a90');
          const cx = 176; for (let y = 20; y <= 100; y++) { const f = (y - 20) / 80, hw = 1 + f * f * 22, c = Math.floor((y - 20) / 10) % 2 ? '#f07020' : '#f0f0f0'; R(cx - hw, y, 2, 1, c); R(cx + hw - 1, y, 2, 1, c); if (y % 5 === 0 && y < 90) R(cx - hw, y, hw * 2, 1, c); }
          R(cx - 7, 48, 14, 4, '#f0f0f0'); R(cx - 12, 70, 24, 4, '#f07020'); R(cx - 1, 8, 2, 12, '#f07020'); },
        beijing(t) { sky(t); ground('#c8b8a0');
          R(10, 72, 236, 28, '#b02020'); R(96, 86, 18, 14, '#601010'); R(142, 86, 18, 14, '#601010');
          R(60, 52, 136, 20, '#b02020'); for (let x = 64; x < 194; x += 10) R(x, 54, 3, 18, '#801010');
          const roof = (y, l, r, h) => { for (let i = 0; i < h; i++) R(l - (h - i) * 1.2, y + i, r - l + (h - i) * 2.4, 1, '#e0b020'); R(l - h * 1.2 - 3, y + h - 3, 4, 3, '#e0b020'); R(r + h * 1.2 - 1, y + h - 3, 4, 3, '#e0b020'); };
          roof(44, 62, 194, 8); roof(28, 84, 172, 8); R(84, 36, 88, 8, '#b02020'); },
        delhi(t) { sky(t, true); ground('#5a9a4a'); R(0, 96, LW, 4, '#c8b890');
          const c = '#c88a5a'; R(98, 28, 60, 72, c); R(94, 24, 68, 6, '#b07848'); R(104, 16, 48, 8, c); R(116, 10, 24, 6, '#b07848');
          R(114, 56, 28, 44, '#5a3a2a'); dome(128, 56, 14, '#5a3a2a'); R(102, 36, 52, 3, '#b07848'); },
        sydney(t) { sky(t); for (let x = 0; x <= 150; x++) { const y = 40 + ((x - 75) / 75) ** 2 * 36; R(x, y, 2, 3, '#505860'); if (x % 10 === 0) R(x, y, 1, 72 - y, '#505860'); } R(0, 72, 160, 3, '#505860');
          water(t, 96); R(130, 88, 110, 10, '#d8c8a8');
          [[140, 50, 22], [160, 44, 26], [184, 54, 20], [202, 60, 16], [218, 66, 12]].forEach(([x, top, w]) => { for (let y = top; y < 88; y++) { const f = (y - top) / (88 - top); R(x, y, w * Math.sqrt(f), 1, '#f8f8f0'); R(x, y, 1, 1, '#c0c0b8'); } }); },
        rio(t) { sky(t); water(t, 100); R(0, 96, LW, 6, '#f0d890');
          for (let dx = -40; dx <= 40; dx++) { const h = Math.sqrt(1 - (dx / 40) ** 2) * 60; R(190 + dx, 98 - h, 1, h, '#4a7a4a'); }
          tri(70, 34, 98, 52, '#3a6a3a'); R(68, 18, 4, 16, '#f0f0f0'); R(60, 22, 20, 3, '#f0f0f0'); R(69, 15, 2, 3, '#f0f0f0');
          for (let x = 110; x < 170; x += 2) R(x, 70 - (x - 110) * 0.3, 1, 1, '#222'); R(140, 60, 6, 5, '#e04040'); },
        buenos(t) { sky(t); skyline(14, '#9a8a98', 36); ground('#707070', 92); for (let x = 0; x < LW; x += 16) R(x, 104, 8, 2, '#fff'); R(0, 92, LW, 3, '#909090');
          R(122, 20, 12, 74, '#f4f4f4'); tri(128, 8, 20, 6, '#f4f4f4'); R(126, 30, 4, 4, '#303030'); R(118, 90, 20, 4, '#d0d0d0');
          [[30, '#9a60c0'], [226, '#9a60c0']].forEach(([x, c]) => { R(x, 76, 3, 18, '#6a4020'); circ(x + 1, 70, 10, c); }); },
        mexico(t) { sky(t, true); ground('#c8a870');
          for (let i = 0; i < 5; i++) { const w = 180 - i * 32, y = 100 - (i + 1) * 12; R(128 - w / 2, y, w, 12, i % 2 ? '#b89868' : '#a88858'); R(128 - w / 2, y, w, 1, '#d8b888'); }
          R(122, 40, 12, 60, '#8a6a40'); for (let y = 42; y < 100; y += 3) R(122, y, 12, 1, '#6a4a28');
          [[26, 76], [230, 80]].forEach(([x, top]) => { R(x, top, 5, 100 - top, '#3a8a3a'); R(x - 6, top + 8, 6, 3, '#3a8a3a'); R(x - 6, top + 2, 3, 8, '#3a8a3a'); R(x + 5, top + 12, 6, 3, '#3a8a3a'); R(x + 8, top + 5, 3, 9, '#3a8a3a'); }); },
        newyork(t) { sky(t); skyline(16, '#6a7080', 48); R(170, 16, 20, 84, '#8890a0'); R(174, 8, 12, 8, '#8890a0'); R(178, 0, 4, 8, '#8890a0'); R(179, -4, 2, 6, '#c0c0c0');
          water(t, 98); R(36, 80, 28, 20, '#a09080'); R(40, 72, 20, 8, '#b0a090');
          const g = '#50a890'; R(44, 44, 12, 28, g); R(46, 36, 8, 8, g); for (let i = 0; i < 5; i++) R(42 + i * 4, 33 - (i % 2) * 2, 2, 4, g); R(55, 22, 3, 16, g); R(54, 16, 5, 6, '#ffd040'); R(38, 52, 6, 3, g); },
        toronto(t) { sky(t); skyline(17, '#6a7488', 34); water(t, 100);
          R(125, 16, 6, 84, '#b8b8b8'); R(127, 0, 2, 16, '#909090'); circ(128, 46, 9, '#a0a0a0'); R(118, 44, 20, 4, '#606878'); R(122, 26, 12, 3, '#a0a0a0');
          dome(176, 100, 18, '#d0d0d8'); },
        athens(t) { sky(t); ground('#a89878', 96);
          for (let y = 70; y < 100; y++) { const w = 90 + (y - 70) * 2.5; R(128 - w, y, w * 2, 1, '#9a8060'); }
          const c = '#ece4cc'; R(58, 64, 140, 6, c); R(62, 36, 132, 5, c); tri(128, 24, 36, 70, c);
          for (let i = 0; i < 9; i++) R(64 + i * 16, 41, 6, 23, c); R(58, 69, 140, 2, '#c8bfa4'); palm(24, 100); },
        istanbul(t) { sky(t); water(t, 100);
          const c = '#d8d0c8'; R(84, 68, 88, 32, c); dome(128, 68, 26, '#a0a8b8'); dome(96, 74, 12, '#a0a8b8'); dome(160, 74, 12, '#a0a8b8'); R(127, 36, 2, 6, '#e0c040');
          [60, 76, 180, 196].forEach(x => { R(x, 24, 5, 76, c); tri(x + 2, 10, 24, 3, '#8090a0'); R(x - 1, 50, 7, 2, '#b0a8a0'); }); },
        amsterdam(t) { sky(t); water(t, 98, '#305070', '#6090b0');
          const cols = ['#a04030', '#304060', '#806040', '#a07040', '#405040', '#903040', '#605050', '#b08050'];
          for (let i = 0; i < 8; i++) { const x = 4 + i * 31, h = 50 + (i * 13) % 20, top = 98 - h;
            R(x, top, 29, h, cols[i]); for (let s = 0; s < 3; s++) R(x + 4 + s * 3, top - 4 - s * 4, 21 - s * 6, 4, cols[i]); R(x + 12, top - 16, 5, 4, cols[i]);
            for (let y = top + 4; y < 90; y += 10) { R(x + 5, y, 6, 6, '#f0f0f0'); R(x + 18, y, 6, 6, '#f0f0f0'); } }
          R(60, 104, 40, 6, '#804020'); R(64, 100, 30, 4, '#f0f0f0'); },
        stockholm(t) { sky(t); water(t, 92);
          R(0, 78, 200, 14, '#4a6a3a'); const cc = ['#c04030', '#e0b040', '#d07030', '#c04030', '#e0d0a0'];
          for (let i = 0; i < 8; i++) { const x = 6 + i * 22; R(x, 60, 18, 18, cc[i % 5]); tri(x + 9, 50, 60, 10, '#503020'); R(x + 4, 64, 4, 4, '#fff'); R(x + 11, 64, 4, 4, '#fff'); }
          R(170, 26, 14, 52, '#b04030'); R(168, 22, 18, 5, '#903020'); [172, 177, 182].forEach(x => R(x - 1, 16, 3, 3, '#f0d040'));
          R(206, 96, 40, 8, '#604020'); [214, 226, 238].forEach(x => R(x, 70, 2, 26, '#402010')); R(210, 76, 32, 1, '#402010'); },
        bangkok(t) { sky(t, true); ground('#b89868', 96); R(0, 104, LW, 16, '#5a7a50');
          const gold = '#e8b830';
          R(60, 70, 136, 30, '#f0e8d8'); for (let x = 64; x < 194; x += 12) R(x, 74, 4, 26, '#e0c890');
          const roof = (y, l, r, c) => { for (let i = 0; i < 10; i++) R(l + i * 2, y + i, r - l - i * 4, 1, c); };
          roof(52, 70, 186, '#d05020'); roof(40, 86, 170, '#208050'); roof(30, 100, 156, '#d05020');
          tri(128, 2, 32, 5, gold); tri(76, 30, 70, 6, gold); tri(180, 30, 70, 6, gold);
          R(12, 92, 22, 10, '#2060c0'); R(10, 86, 26, 3, '#f0d040'); R(14, 101, 4, 4, '#000'); R(30, 101, 4, 4, '#000'); },
        lima(t) { sky(t); mountains([[170, 30, 60], [230, 40, 50], [120, 44, 50]], '#6a6a5a', true); water(t, 96);
          R(0, 70, 110, 30, '#b0986a'); for (let x = 4; x < 100; x += 14) { R(x, 58 - (x % 3) * 4, 12, 12 + (x % 3) * 4, pick2(['#e0c080', '#f0f0e0', '#d09060'], x)); R(x + 3, 62, 3, 3, '#305070'); }
          const lx = 150; R(lx, 84, 16, 9, '#f0e8d8'); R(lx + 13, 72, 4, 13, '#f0e8d8'); R(lx + 13, 70, 6, 3, '#f0e8d8'); R(lx + 14, 68, 1, 2, '#f0e8d8'); [0, 4, 10, 14].forEach(dx => R(lx + dx, 93, 2, 7, '#f0e8d8')); },
        capetown(t) { sky(t); const c = '#6a7a6a';
          for (let y = 36; y < 100; y++) { const w = 90 + Math.max(0, y - 50) * 1.5; R(128 - w, y, w * 2, 1, y < 50 ? c : '#5a6a5a'); }
          const drift = Math.sin(t / 1500) * 4; R(40 + drift, 30, 176, 8, '#f8f8f8'); R(50 + drift, 27, 150, 4, '#f0f0f0'); for (let x = 44; x < 214; x += 9) R(x + drift, 38, 5, 4 + (x % 3) * 2, '#f0f0f0');
          skyline(24, '#a0a8b0', 12); water(t, 100);
          const px = 214; R(px, 96, 8, 12, '#101010'); R(px + 2, 99, 4, 8, '#fff'); R(px + 3, 94, 3, 3, '#101010'); R(px + 6, 95, 3, 1, '#f0a020'); },
        reykjavik(t) { const night = sky(t); if (night) for (let x = 0; x < LW; x += 2) { const y = 20 + Math.sin(x / 20 + t / 900) * 8; R(x, y, 2, 10, 'rgba(80,255,140,.5)'); }
          mountains([[40, 50, 60], [110, 40, 70], [210, 46, 70]], '#586878', true); ground('#5a6a50', 96);
          R(52, 26, 10, 70, '#d8d8d0'); for (let i = 1; i < 5; i++) { R(52 - i * 4, 26 + i * 14, 4, 70 - i * 14, '#c8c8c0'); R(62 + (i - 1) * 4, 26 + i * 14, 4, 70 - i * 14, '#c8c8c0'); } tri(57, 12, 26, 5, '#d8d8d0');
          [[90, '#d04030'], [112, '#3070c0'], [134, '#e0c040']].forEach(([x, c]) => { R(x, 80, 18, 16, '#f0f0f0'); tri(x + 9, 72, 80, 11, c); });
          const h = 20 + Math.abs(Math.sin(t / 700)) * 36; for (let y = 0; y < h; y++) R(196 - (h - y) / 8 + Math.sin(y + t / 60), 96 - y, 6 + (h - y) / 4, 1, y > h - 6 ? '#fff' : '#c0f0ff'); },
        kathmandu(t) { sky(t); mountains([[40, 26, 60], [110, 16, 66], [190, 22, 70], [250, 34, 50]], '#6878a0', true); ground('#8a7a5a', 96);
          dome(128, 96, 28, '#f4f4f0'); R(114, 60, 28, 10, '#e8c040'); R(118, 62, 8, 3, '#fff'); R(130, 62, 8, 3, '#fff'); R(121, 63, 3, 2, '#203080'); R(133, 63, 3, 2, '#203080'); R(127, 66, 2, 3, '#203080');
          for (let i = 0; i < 6; i++) R(122 + i, 58 - i * 5, 12 - i * 2, 4, '#e0b030'); R(127, 24, 2, 6, '#e0b030');
          const fc = ['#2060d0', '#f0f0f0', '#d02020', '#20a040', '#f0d020']; for (let i = 0; i < 16; i++) { R(128 + i * 7, 58 + i * 2.2, 4, 5, fc[i % 5]); R(124 - i * 7, 58 + i * 2.2, 4, 5, fc[(i + 2) % 5]); } },
        marrakesh(t) { sky(t, true); mountains([[60, 50, 70], [160, 44, 80], [240, 54, 60]], '#8a7a8a', true); ground('#c87848', 96);
          R(0, 82, LW, 18, '#b85a38'); for (let x = 0; x < LW; x += 8) R(x, 78, 5, 4, '#b85a38');
          R(110, 20, 30, 80, '#c88050'); R(118, 8, 14, 12, '#c88050'); R(106, 18, 38, 3, '#a86040'); R(124, 0, 2, 8, '#e0c040'); [2, 5].forEach(y => R(123, y, 4, 2, '#e0c040'));
          for (let y = 30; y < 80; y += 16) R(121, y, 8, 10, '#8a4a28'); palm(40, 96); palm(206, 96); palm(228, 96); }
      };
      function pick2(a, i) { return a[i % a.length]; }

      function drawGlobe(cx, cy, r, rot) {
        const d = gimg.data, S = 80, R0 = 38;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const i = (y * S + x) * 4, nx = (x - 40 + 0.5) / R0, ny = (y - 40 + 0.5) / R0, rr = nx * nx + ny * ny;
          if (rr > 1) { d[i + 3] = 0; continue; }
          const nz = Math.sqrt(1 - rr), lat = Math.asin(-ny), lon = Math.atan2(nx, nz) + rot;
          let lo = ((lon * 180 / Math.PI + 180) % 360 + 360) % 360, la = lat * 180 / Math.PI;
          const row = Math.min(17, Math.floor((90 - la) / 10)), col = Math.floor(lo / 10) % 36;
          const land = LANDSET.has(row * 36 + col), shade = 0.55 + 0.45 * nz;
          const c = row >= 16 ? [230, 240, 250] : land ? [60, 170, 70] : [40, 90, 220];
          d[i] = c[0] * shade; d[i + 1] = c[1] * shade; d[i + 2] = c[2] * shade; d[i + 3] = 255;
        }
        gctx.putImageData(gimg, 0, 0);
        ctx.drawImage(globeBuf, cx - 40, cy - 40);
        void r;
      }
      function titleArt(t) {
        R(0, 0, LW, LH, '#000030'); seed = 3; for (let i = 0; i < 60; i++) R(sr() * LW, sr() * LH, 1, 1, Math.sin(t / 400 + i) > 0.3 ? '#fff' : '#557');
        drawGlobe(64, 62, 38, t / 2500);
        // magnifying glass
        const mx = 64 + Math.sin(t / 900) * 18, my = 58 + Math.cos(t / 1100) * 12;
        for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2; R(mx + Math.cos(an) * 14, my + Math.sin(an) * 14, 2, 2, '#e0c040'); }
        for (let i = 0; i < 14; i++) R(mx + 10 + i, my + 10 + i, 4, 4, '#8a4a1a');
        txt('GLOBE', 176, 26, '#ffcc00', 4, true, '#a01010');
        txt('DETECTIVE', 176, 50, '#ffffff', 2, true, '#a01010');
        txt('THE STICKY FINGERS', 176, 76, '#88aaff', 1, true); txt('SOCIETY IS LOOSE!', 176, 84, '#88aaff', 1, true);
        txt(rank() + ' ' + prof.name.replace(/[^A-Za-z0-9 .'-]/g, ''), 176, 102, '#55ff55', 1, true);
      }
      function planeArt(t, o) {
        ['#3070d8', '#4890f0', '#70b0ff', '#a8d4ff'].forEach((c, i) => R(0, i * 30, LW, 31, c));
        for (let i = 0; i < 10; i++) { const x = ((i * 67 - t * 0.12 * (1 + i % 3)) % (LW + 60) + LW + 60) % (LW + 60) - 40, y = 10 + (i * 29) % 100; R(x, y, 30, 6, '#fff'); R(x + 6, y - 3, 16, 3, '#fff'); }
        const bob = Math.sin(t / 300) * 2, px = 100, py = 52 + bob;
        R(px, py, 56, 10, '#f0f0f0'); R(px + 56, py + 2, 6, 6, '#f0f0f0'); R(px + 58, py + 3, 3, 3, '#3050a0'); R(px - 6, py - 12, 10, 14, '#c02020');
        R(px + 18, py + 6, 20, 16, '#d0d0d0'); R(px + 20, py - 8, 14, 8, '#d0d0d0'); for (let x = px + 10; x < px + 54; x += 6) R(x, py + 2, 3, 3, '#3050a0'); R(px, py + 7, 56, 1, '#c02020');
        if (o.from) { const s = (o.from + ' > ' + o.to).replace(/[^A-Za-z .>-]/g, ''); R(0, 96, LW, 16, 'rgba(0,0,0,.45)'); txt(s, LW / 2, 101, '#ffcc00', 1, true); }
      }
      function crookSprite(x, y, k, s = 3) {
        const P = (dx, dy, w, h, c) => R(x + dx * s, y + dy * s, w * s, h * s, c);
        const hc = HAIRC[k.hair];
        P(3, 0, 6, 2, hc); P(2, 1, 1, 3, hc); P(9, 1, 1, 3, hc);
        P(3, 2, 6, 5, '#f0b890'); P(4, 4, 1, 1, '#000'); P(7, 4, 1, 1, '#000'); P(5, 6, 2, 1, '#a04040');
        if (k.look === 'Monocle') { P(6, 3, 3, 3, '#e0c040'); P(7, 4, 1, 1, '#000'); P(8, 6, 1, 3, '#e0c040'); }
        if (k.look === 'Freckles') { P(3, 5, 1, 1, '#c07040'); P(8, 5, 1, 1, '#c07040'); }
        P(2, 7, 8, 8, '#402060'); P(0, 8, 2, 6, '#402060'); P(10, 8, 2, 6, '#402060');
        if (k.look === 'Bow tie') { P(4, 7, 1, 1, '#e02020'); P(5, 7, 2, 1, '#a01010'); P(7, 7, 1, 1, '#e02020'); }
        if (k.look === 'Polka-dot scarf') { P(3, 7, 6, 2, '#e02060'); P(4, 7, 1, 1, '#fff'); P(7, 8, 1, 1, '#fff'); }
        P(3, 15, 2, 5, '#303030'); P(7, 15, 2, 5, '#303030');
        if (k.look === 'Big boots') { P(1, 19, 4, 2, '#6a3a10'); P(7, 19, 4, 2, '#6a3a10'); } else { P(2, 19, 3, 1, '#000'); P(7, 19, 3, 1, '#000'); }
      }
      function endArt(t, o) {
        (ART[o.city] || ART.paris)(t);
        const k = CROOKS[o.crook];
        if (o.win) {
          crookSprite(110, 40, k, 2);
          for (let x = 100; x <= 150; x += 6) R(x, 34, 2, 52, '#303030'); R(98, 32, 56, 3, '#303030'); R(98, 84, 56, 3, '#303030');
          txt('GOTCHA!', LW / 2, 8, '#ffcc00', 3, true, '#000');
        } else {
          const bx = 160 + Math.sin(t / 900) * 6, by = 8 + (t / 60) % 30;
          circ(bx, by + 14, 14, '#e04040'); for (let i = -12; i < 14; i += 6) R(bx + i, by + 2, 3, 24, '#f0d040');
          R(bx - 6, by + 34, 12, 8, '#8a5a2a'); R(bx - 6, by + 28, 1, 6, '#000'); R(bx + 5, by + 28, 1, 6, '#000');
          R(bx - 2, by + 30, 5, 4, HAIRC[k.hair]);
          txt('ESCAPED!', LW / 2 - 50, 90, '#ffffff', 2, true, '#000');
        }
      }
      function witnessArt(t, o) {
        (ART[o.city] || ART.paris)(t);
        R(8, 20, 60, 72, '#000'); R(10, 22, 56, 68, '#c0c0c0'); R(12, 24, 52, 64, o.bg || '#305080');
        seed = o.seed || 5; const skin = pick2(['#f0c8a0', '#d8a070', '#a86840', '#704020'], Math.floor(sr() * 4)), hair = pick2(['#302010', '#f0d040', '#a04020', '#101010', '#909090'], Math.floor(sr() * 5)), shirt = pick2(['#c03030', '#3060c0', '#30a050', '#e0a020', '#8040a0'], Math.floor(sr() * 5));
        R(26, 36, 24, 26, skin); R(24, 32, 28, 8, hair); R(24, 36, 4, 12, hair); R(31, 44, 4, 3, '#000'); R(41, 44, 4, 3, '#000');
        const talk = Math.floor(t / 180) % 2; R(34, 54, 8, talk ? 3 : 1, '#802020');
        R(18, 64, 40, 24, shirt); R(34, 62, 8, 4, skin);
        txt(o.place || '', 38, 80, '#fff', 1, true);
      }
      function mainArt(t) { const c = C ? C.pos : 'paris'; (ART[c] || ART.paris)(t); }
      const SC = { title: titleArt, city: mainArt, plane: planeArt, end: endArt, witness: witnessArt };
      function loop(ts) {
        raf = requestAnimationFrame(loop);
        if (W.el && W.el.classList.contains('min')) return;
        try { (SC[scene.name] || mainArt)(ts, scene); } catch (e) { console.error(e); cancelAnimationFrame(raf); }
      }
      function fit() {
        const bw = W.body.clientWidth - 8, bh = W.body.clientHeight;
        if (!bw || !bh) return;
        root.classList.toggle('gdt-sm', bw < 440);
        let w = Math.min(bw, bh * 0.4 * LW / LH);
        if (w >= LW * 2) w = Math.floor(w / LW) * LW;
        cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(w * LH / LW) + 'px';
      }
      W.onResize = fit;

      /* ---------- UI plumbing ---------- */
      const SVG = {
        look: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><circle cx="6" cy="6" r="4.5" fill="#bfe" stroke="#000"/><path d="M9 10l1-1 5 5-1 1z" fill="#840" stroke="#000" stroke-width=".6"/></svg>',
        plane: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 8h14v2H1z" fill="#fff" stroke="#000" stroke-width=".7"/><path d="M6 8l2-6h2L9 8zM6 10l2 5h2l-1-5zM1 6h2l1 2H1z" fill="#c22" stroke="#000" stroke-width=".6"/></svg>',
        pc: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="1" width="14" height="10" fill="#dcd8c0" stroke="#000"/><rect x="3" y="3" width="10" height="6" fill="#008"/><path d="M4 5h5M4 7h7" stroke="#5f5"/><rect x="4" y="12" width="8" height="3" fill="#dcd8c0" stroke="#000"/></svg>',
        book: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="1" width="12" height="14" fill="#a22" stroke="#000"/><rect x="4" y="3" width="8" height="4" fill="#fec"/><path d="M4 10h8M4 12h6" stroke="#fec"/></svg>',
        back: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M2 8l6-6v4h6v4H8v4z" fill="#ff0" stroke="#000"/></svg>'
      };
      function header(title, sub, time) { topB.textContent = title; topS.textContent = sub || ''; clockEl.textContent = time || ''; clockEl.style.display = time ? '' : 'none'; }
      function buttons(list) {
        keys = {};
        actsEl.className = 'gdt-acts' + (list.length === 2 ? ' gdt-a2' : list.length === 3 ? ' gdt-a3' : '');
        actsEl.innerHTML = '';
        list.forEach(b => {
          const el = document.createElement('button'); el.className = 'btn'; el.type = 'button';
          const lbl = b.key && b.key.length === 1 && b.label.toLowerCase().indexOf(b.key.toLowerCase()) >= 0 && !/^\d$/.test(b.key)
            ? (() => { const i = b.label.toLowerCase().indexOf(b.key.toLowerCase()); return esc(b.label.slice(0, i)) + '<u>' + esc(b.label[i]) + '</u>' + esc(b.label.slice(i + 1)); })()
            : (b.key && /^\d$/.test(b.key) ? b.key + '. ' : '') + esc(b.label);
          el.innerHTML = (b.icon ? SVG[b.icon] : '') + '<span>' + lbl + (b.sub ? '<small>' + esc(b.sub) + '</small>' : '') + '</span>';
          if (b.disabled) el.disabled = true;
          el.addEventListener('click', () => { if (!b.disabled) { sfx('click'); b.fn(); } });
          actsEl.appendChild(el);
          if (b.key) keys[b.key.toLowerCase()] = b;
        });
      }
      function say(html) { txtEl.innerHTML = html; txtEl.scrollTop = 0; }
      W.onKey = e => {
        if (dead) return;
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        const k = e.key === 'Escape' ? 'escape' : e.key === 'Enter' ? 'enter' : e.key.toLowerCase();
        const b = keys[k];
        if (b && !b.disabled) { e.preventDefault(); sfx('key'); b.fn(); }
      };

      /* ---------- title ---------- */
      function title() {
        scene = { name: 'title' };
        header('Globe Detective', 'Compass Rose Interactive', '');
        const nr = nextRank(prof.solved);
        say('<h3>Welcome to the Globe Detective Agency</h3><p>The <b>Sticky Fingers Society</b> is stealing the world\'s most famous treasures, and it\'s your job to chase them across the globe, one clue at a time.</p>' +
          '<p>Detective name: <input class="gdt-in" maxlength="14" value="' + esc(prof.name) + '" aria-label="Detective name"></p>' +
          '<p>Rank: <b>' + rank() + '</b> &middot; Cases solved: <b>' + prof.solved + '</b>' + (nr ? ' &middot; ' + (nr[0] - prof.solved) + ' more to become ' + nr[1] : '') + '</p>' +
          (C ? '<p class="gdt-note">You have a case in progress: ' + esc(CITY[C.trail[0]].name) + ', ' + clock(C.time) + '.</p>' : ''));
        const inp = txtEl.querySelector('input');
        const setName = () => { const v = inp.value.trim().replace(/\s+/g, ' ').slice(0, 14); if (v) { prof.name = v; api.save('profile', prof); } };
        inp.addEventListener('change', setName); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setName(); inp.blur(); } });
        const list = [];
        if (C) list.push({ label: 'Continue case', key: 'c', icon: 'look', fn: () => { setName(); cityView(); } });
        list.push({ label: 'New case', key: 'n', icon: 'book', fn: () => { setName(); if (C) api.msgBox('New case', 'Start a new case? The case you are working on will be dropped.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') newCase(); }); else newCase(); } });
        list.push({ label: 'How to play', key: 'h', icon: 'pc', fn: () => help(title) });
        list.push({ label: 'Dossiers', key: 'd', icon: 'book', fn: () => dossiers(title) });
        buttons(list);
      }
      function help(back) {
        scene = { name: 'title' };
        header('How to play', 'Globe Detective', '');
        say('<h3>How to play</h3><ul class="gdt-list"><li>A member of the Sticky Fingers Society has stolen a treasure. You have until <b>Sunday at 5 pm</b> to catch them.</li>' +
          '<li><b>Investigate</b> (I) three places in each city. Witnesses tell you about the crook\'s <b>next</b> city: its flag, money, language, landmarks, rivers and food. Sometimes they also describe the crook.</li>' +
          '<li><b>Travel</b> (T) to one of four cities. Flights take time, and so does investigating. You sleep from 11 pm to 7 am.</li>' +
          '<li>If witnesses say nobody has seen the crook, you went the wrong way. Fly back and try another city.</li>' +
          '<li>Use the <b>Crime Computer</b> (C) to enter what you know about the crook. When only one member of the Society matches, you get a <b>warrant</b>.</li>' +
          '<li>When you reach the crook\'s hideout, keep investigating to make the arrest. Without the right warrant, they get away!</li>' +
          '<li>Your <b>Notebook</b> (N) keeps every clue you have heard. The game is set in 1995, so money clues use the currencies of that year.</li></ul>');
        buttons([{ label: 'Back', key: 'escape', icon: 'back', fn: back || title }]);
      }
      function dossiers(back) {
        say('<h3>Sticky Fingers Society dossiers</h3><div class="gdt-dos">' + CROOKS.map(k => '<div><b>' + esc(k.name) + '</b>Hair: ' + k.hair + '<br>Hobby: ' + k.hobby + '<br>Vehicle: ' + k.ride + '<br>Feature: ' + k.look + '<br><i>' + esc(k.bio) + '</i></div>').join('') + '</div>');
        buttons([{ label: 'Back', key: 'escape', icon: 'back', fn: back }]);
      }

      /* ---------- a new case ---------- */
      function newCase() {
        const hops = 4 + Math.min(3, Math.floor(prof.solved / 3));
        const ids = shuffle(CITIES.map(c => c.id));
        const trail = [ids[0]];
        for (let i = 1; trail.length <= hops && i < ids.length; i++) { const last = CITY[trail[trail.length - 1]]; if (km(last, CITY[ids[i]]) > 900) trail.push(ids[i]); }
        const crook = rnd(CROOKS.length);
        const traitCities = shuffle([0, 1, 2, 3]); // which trail stop reveals which trait
        C = { crook, trail, hops: trail.length - 1, pos: trail[0], from: null, time: START_H, visits: {}, warrant: null, sel: ['', '', '', ''], notes: [], traitAt: traitCities, final: 0, over: false };
        prepVisit(trail[0], null);
        save();
        const loot = CITY[trail[0]].loot;
        scene = { name: 'city' };
        header('Case file: ' + CITY[trail[0]].name, 'Globe Detective Agency', clock(C.time));
        jingle([[64, 0], [67, 0.12], [72, 0.24], [71, 0.4], [67, 0.55, 0.3]]);
        say('<h3>Flash! Treasure stolen in ' + esc(CITY[trail[0]].name) + '!</h3><p>This morning, a thief made off with <b>' + esc(loot) + '</b>.</p><p>A member of the Sticky Fingers Society was seen leaving the scene. We don\'t know which one yet.</p><p>You must track the crook to their hideout, get a warrant, and make the arrest by <b>Sunday at 5 pm</b>.</p><p>Good luck, ' + rank() + ' ' + esc(prof.name) + '!</p>');
        buttons([{ label: 'Start the case', key: 'enter', icon: 'look', fn: cityView }]);
      }
      function trailIndex(id) { return C.trail.indexOf(id); }
      function prepVisit(id, from) {
        if (C.visits[id]) return C.visits[id];
        const k = trailIndex(id), idx = CITIES.findIndex(c => c.id === id);
        const places = shuffle(PLACES).slice(0, 3);
        const others = shuffle(CITIES.map(c => c.id).filter(x => x !== id && !C.trail.includes(x)));
        let opts, stmts;
        if (k >= 0 && k < C.hops) {
          const next = C.trail[k + 1];
          const back = k > 0 ? C.trail[k - 1] : null;
          opts = [next]; if (back) opts.push(back);
          while (opts.length < 4) opts.push(others.shift());
          const tags = new Set();
          opts.forEach(o => { if (o !== next) CITY[o].clues.forEach(c => { if (clueTag(c)) tags.add(clueTag(c)); }); });
          const pool = shuffle(CITY[next].clues.filter(c => !clueTag(c) || !tags.has(clueTag(c))));
          stmts = [0, 1, 2].map(i => clueText(pool[i % pool.length]));
          const tr = C.traitAt[k];
          if (tr != null) { const T = TRAITS[tr], v = CROOKS[C.crook][T.k], j = rnd(3); stmts[j] += ' Oh, and the person ' + SAY[T.k][v] + '.'; }
          // an extra trait hint on longer trails, for the stops after the fourth
          if (tr == null && k >= 4 && Math.random() < 0.6) { const T = TRAITS[rnd(4)]; stmts[rnd(3)] += ' I also noticed the person ' + SAY[T.k][CROOKS[C.crook][T.k]] + '.'; }
        } else if (k === C.hops) {
          opts = [C.trail[k - 1]]; while (opts.length < 4) opts.push(others.shift());
          const T = TRAITS[rnd(4)];
          stmts = ['Careful, detective! Someone who ' + SAY[T.k][CROOKS[C.crook][T.k]] + ' was sneaking around here just a few minutes ago.', 'You are very close now. I heard someone hiding right around the corner!', 'Shh! I think they are still in town.'];
        } else {
          opts = [from]; while (opts.length < 4) opts.push(others.shift());
          if (!from) opts[0] = others.shift();
          stmts = shuffle(NOBODY).slice(0, 3);
        }
        const v = { opts: shuffle(opts.filter(Boolean)), places: places.map(p => p[0]), who: places.map(p => p[1]), stmts, seen: [false, false, false], n: 0, idx };
        C.visits[id] = v;
        return v;
      }
      function spend(h) {
        C.time += h;
        let slept = false;
        const hh = C.time % 24;
        if (hh >= 23 || hh < 7) { C.time = (hh >= 23 ? C.time + (24 - hh) : C.time - hh) + 7; slept = true; }
        return slept;
      }
      function timeUp() { return C.time >= DEADLINE; }

      /* ---------- in a city ---------- */
      function cityView(note) {
        if (!C) return title();
        if (timeUp()) return lose('time');
        const c = CITY[C.pos], v = prepVisit(C.pos, C.from);
        scene = { name: 'city' };
        header(c.name + ', ' + c.country, 'Case: ' + CITY[C.trail[0]].loot, clock(C.time));
        const w = C.warrant == null ? '<span class="gdt-warn">No warrant yet.</span>' : 'Warrant issued for <b>' + esc(CROOKS[C.warrant].name) + '</b>.';
        say((note ? '<p class="gdt-note">' + note + '</p>' : '') + '<h3>' + esc(c.name) + '</h3><p>' + cityBlurb(c) + '</p><p>' + w + ' Deadline: Sunday 5:00 pm.</p>');
        buttons([
          { label: 'Investigate', key: 'i', icon: 'look', fn: investigateMenu },
          { label: 'Travel', key: 't', icon: 'plane', fn: travelMenu },
          { label: 'Crime Computer', key: 'c', icon: 'pc', fn: computer },
          { label: 'Notebook', key: 'n', icon: 'book', fn: notebook }
        ]);
        save();
      }
      function cityBlurb(c) {
        const h = C.time % 24;
        const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
        return 'It is ' + part + ' in ' + esc(c.name) + '. Where would you like to look for clues?';
      }
      function investigateMenu() {
        const v = C.visits[C.pos], cost = [2, 3, 4];
        say('<h3>Investigate</h3><p>Where do you want to ask questions? Each stop takes a few hours.</p>');
        buttons(v.places.map((p, i) => ({ label: p, key: String(i + 1), sub: v.seen[i] ? 'visited' : '+' + cost[Math.min(v.n, 2)] + ' hours', fn: () => ask(i) }))
          .concat([{ label: 'Back', key: 'escape', icon: 'back', fn: () => cityView() }]));
      }
      function ask(i) {
        const v = C.visits[C.pos], cost = [2, 3, 4][Math.min(v.n, 2)];
        const k = trailIndex(C.pos);
        const first = !v.seen[i];
        let slept = false;
        if (first) { slept = spend(cost); v.n++; v.seen[i] = true; }
        if (timeUp()) return lose('time');
        if (k === C.hops && k >= 0 && first) {
          C.final++;
          if (C.final >= 2) return arrest(v.places[i]);
        }
        const st = v.stmts[i];
        if (first && trailIndex(C.pos) >= 0 && trailIndex(C.pos) < C.hops) C.notes.push({ city: C.pos, place: v.places[i], text: st });
        save();
        scene = { name: 'witness', city: C.pos, place: v.places[i], seed: v.idx * 7 + i + 1, bg: ['#305080', '#503050', '#306040'][i] };
        header(CITY[C.pos].name + ': ' + v.places[i], CITY[C.pos].country, clock(C.time));
        tone(660, 0.05); tone(880, 0.06, { at: 0.07 });
        say((slept ? '<p class="gdt-note">You got a good night\'s sleep at the hotel.</p>' : '') + '<p><span class="gdt-who">' + esc(cap(v.who[i])) + ' says:</span></p><p class="gdt-q">"' + esc(st) + '"</p>');
        buttons([{ label: 'OK', key: 'enter', fn: investigateMenu }, { label: 'Back to ' + CITY[C.pos].name, key: 'escape', icon: 'back', fn: () => cityView() }]);
      }
      const cap = s => s[0].toUpperCase() + s.slice(1);
      function travelMenu() {
        const v = C.visits[C.pos];
        say('<h3>Travel</h3><p>Where do you want to fly? Pick the city that matches your clues.</p>');
        buttons(v.opts.map((id, i) => ({ label: CITY[id].name, key: String(i + 1), sub: CITY[id].country + ', ' + flightH(C.pos, id) + ' h', fn: () => fly(id) }))
          .concat([{ label: 'Back', key: 'escape', icon: 'back', fn: () => cityView() }]));
      }
      function fly(id) {
        const from = C.pos, h = flightH(from, id);
        const slept = spend(h);
        C.from = from; C.pos = id; prepVisit(id, from);
        save();
        scene = { name: 'plane', from: CITY[from].name, to: CITY[id].name };
        header('In flight', CITY[from].name + ' to ' + CITY[id].name, clock(C.time));
        say('<p>Flying from ' + esc(CITY[from].name) + ' to ' + esc(CITY[id].name) + '. The flight takes ' + h + ' hours.</p>');
        buttons([]);
        if (sound) { api.noise(1.4, { ft: 'lowpass', f: 500, vol: 0.05 }); }
        const tid = setTimeout(() => { if (dead) return; if (timeUp()) return lose('time'); sfx('ding'); cityView(slept ? 'You slept on the plane and at the hotel.' : 'You land in ' + esc(CITY[id].name) + '.'); }, 1700);
        timers.push(tid);
        keys = { enter: { fn: () => { clearTimeout(tid); if (timeUp()) return lose('time'); cityView(); } } };
      }
      const timers = [];
      function computer() {
        say('<h3>Crime Computer</h3><p>Enter what you know about the crook, then press Compute.</p><div class="gdt-cc">' + TRAITS.map((T, i) => '<label for="gdt-t' + i + '">' + T.label + ':</label><select id="gdt-t' + i + '"><option value="">(unknown)</option>' + T.vals.map(v => '<option' + (C.sel[i] === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>').join('') + '</div><div class="gdt-res">' + (C.warrant != null ? 'Current warrant: <b>' + esc(CROOKS[C.warrant].name) + '</b>' : '') + '</div>');
        txtEl.querySelectorAll('select').forEach((s, i) => s.addEventListener('change', () => { C.sel[i] = s.value; save(); }));
        buttons([{ label: 'Compute', key: 'enter', icon: 'pc', fn: compute }, { label: 'Dossiers', key: 'd', icon: 'book', fn: () => dossiers(computer) }, { label: 'Back', key: 'escape', icon: 'back', fn: () => cityView() }]);
      }
      function compute() {
        const m = CROOKS.map((k, i) => i).filter(i => TRAITS.every((T, j) => !C.sel[j] || CROOKS[i][T.k] === C.sel[j]));
        const res = txtEl.querySelector('.gdt-res');
        [220, 330, 440, 330, 550].forEach((f, i) => tone(f, 0.04, { at: i * 0.06, vol: 0.03 }));
        if (m.length === 1) { C.warrant = m[0]; save(); jingle([[72, 0.3], [79, 0.42, 0.3]]); res.innerHTML = '<p class="gdt-note">Match found! A <b>warrant</b> has been issued for <b>' + esc(CROOKS[m[0]].name) + '</b>.</p>'; }
        else if (!m.length) res.innerHTML = '<p class="gdt-warn">No member of the Sticky Fingers Society matches. Check your clues!</p>';
        else res.innerHTML = '<p>' + m.length + ' possible suspects: ' + m.map(i => esc(CROOKS[i].name)).join(', ') + '. You need more clues for a warrant.</p>';
      }
      function notebook() {
        const n = C.notes;
        say('<h3>Notebook</h3>' + (n.length ? '<ul class="gdt-list">' + n.map(x => '<li><b>' + esc(CITY[x.city].name) + ', ' + esc(x.place) + ':</b> ' + esc(x.text) + '</li>').join('') + '</ul>' : '<p>No clues yet. Go investigate!</p>') + '<p>Stolen: ' + esc(CITY[C.trail[0]].loot) + ' (' + esc(CITY[C.trail[0]].name) + ').</p>');
        buttons([{ label: 'Back', key: 'escape', icon: 'back', fn: () => cityView() }]);
      }

      /* ---------- endings ---------- */
      function arrest(place) {
        if (C.warrant === C.crook) return win(place);
        lose(C.warrant == null ? 'nowarrant' : 'wrong', place);
      }
      function win(place) {
        const k = CROOKS[C.crook], c = CITY[C.pos], loot = CITY[C.trail[0]].loot;
        const before = rank();
        prof.solved++; const after = rank();
        C.over = true; const done = C; C = null; save(); api.save('case', null);
        scene = { name: 'end', city: done.pos, crook: done.crook, win: true };
        header('Case closed!', c.name + ', ' + c.country, clock(done.time));
        jingle([[60, 0], [64, 0.12], [67, 0.24], [72, 0.36], [67, 0.5], [72, 0.62], [76, 0.74], [79, 0.86, 0.5]]);
        const got = api.earn(6, 'solving a Globe Detective case');
        say('<h3>You caught ' + esc(k.name) + '!</h3><p>At the ' + esc(place) + ' in ' + esc(c.name) + ', you spot a suspicious figure. Your warrant matches: <b>' + esc(k.name) + '</b> is under arrest, and ' + esc(loot) + ' is on its way home.</p>' +
          '<p>Solved on ' + clock(done.time) + '. Cases solved: <b>' + prof.solved + '</b>.' + (after !== before ? ' <span class="gdt-note">Promotion! You are now a <b>' + after + '</b>.</span>' : '') + '</p>' + (got ? '<p class="gdt-note">You earned $' + got.toFixed(2) + '.</p>' : ''));
        buttons([{ label: 'New case', key: 'n', icon: 'book', fn: newCase }, { label: 'Title screen', key: 'escape', icon: 'back', fn: title }]);
      }
      function lose(why, place) {
        const done = C; const k = CROOKS[done.crook], c = CITY[done.pos];
        C = null; api.save('case', null); save();
        scene = { name: 'end', city: done.pos, crook: done.crook, win: false };
        header(why === 'time' ? 'Out of time' : 'The crook got away', c.name + ', ' + c.country, clock(Math.min(done.time, DEADLINE)));
        jingle([[67, 0], [63, 0.18], [60, 0.36, 0.4]]);
        const msg = why === 'time' ? '<h3>Time\'s up!</h3><p>It is Sunday at 5 pm, and the trail has gone cold. The thief was <b>' + esc(k.name) + '</b>, hiding in <b>' + esc(CITY[done.trail[done.hops]].name) + '</b>.</p>'
          : why === 'nowarrant' ? '<h3>No warrant!</h3><p>At the ' + esc(place) + ' you find <b>' + esc(k.name) + '</b>, but you have no warrant. They tip their hat and float away. Remember to use the Crime Computer!</p>'
            : '<h3>Wrong warrant!</h3><p>At the ' + esc(place) + ' you find <b>' + esc(k.name) + '</b>, but your warrant is for <b>' + esc(CROOKS[done.warrant].name) + '</b>. The real thief slips away!</p>';
        say(msg + '<p>Better luck on the next case, ' + rank() + ' ' + esc(prof.name) + '.</p>');
        buttons([{ label: 'New case', key: 'n', icon: 'book', fn: newCase }, { label: 'Title screen', key: 'escape', icon: 'back', fn: title }]);
      }

      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New case', fn: () => { if (C) api.msgBox('New case', 'Start a new case? The case you are working on will be dropped.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') newCase(); }); else newCase(); } },
          { label: 'Continue case', fn: cityView, disabled: !C },
          { label: 'Title screen', fn: title }, '-',
          { label: 'How to play', fn: () => help(C ? () => cityView() : title) },
          { label: 'Dossiers', fn: () => dossiers(C ? cityView : title) }, '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [{ label: sound ? 'Sound off' : 'Sound on', fn: () => { sound = !sound; api.save('sound', sound); } }] }
      ]);
      W.onClose = () => { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (C) api.save('case', C); };
      fit();
      title();
      raf = requestAnimationFrame(loop);
      setTimeout(fit, 0);
    }
  });
})();
