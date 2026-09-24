/* More of the 1990 Web: text-heavy early pages on PrairieNet and a university server.
   Each page registers on window.RETRO_SITES (see js/web/README.md). */
(function () {
  'use strict';
  const SITES = (window.RETRO_SITES = window.RETRO_SITES || []);
  const Y = ['1990'];
  const U = {
    home: 'http://www.prairienet.com/', finder: 'http://www.webfinder.com/', kevin: 'http://members.prairienet.com/~kevin/',
    news: 'http://www.dailybyte.com/', shack: 'http://www.shareware-shack.com/',
    weather: 'http://www.prairienet.com/weather/', physics: 'http://www.prairie-state.edu/physics/', cool: 'http://www.prairie-state.edu/~bpatel/cool.html',
    recipes: 'http://www.recipe-archive.org/', library: 'http://www.prairie-state.edu/library/', jokes: 'http://www.jokeoftheday.com/',
    bbs: 'http://www.prairienet.com/bbs/', dana: 'http://members.prairienet.com/~dana/', marcus: 'http://members.prairienet.com/~marcus/'
  };
  const ENTRIES = [];
  function reg(eras, url, page, search) {
    (search || []).forEach(s => ENTRIES.push(Object.assign({ url }, s)));
    SITES.push({ eras, url, page: (u, h) => page(h, u), search: (search || []).map(s => Object.assign({ url }, s)) });
  }
  const back = h => `<p>${h.A(U.home, 'Back to PrairieNet')} | ${h.A(U.cool, 'Cool Links')} | ${h.A(U.finder, 'WebFinder')}</p>`;

  /* ---------- weather (the PrairieNet home page links here) ---------- */
  reg(Y, U.weather, h => {
    const days = [['MON', 'Partly cloudy', 52, 34], ['TUE', 'Sunny', 58, 37], ['WED', 'Windy', 55, 33], ['THU', 'Rain (says Earl\'s knee)', 47, 36], ['FRI', 'Clearing', 50, 31]];
    const radar = h.fmtTime(200 / h.rateKB());
    return { title: 'PrairieNet Weather', cls: '', blocks: [
      `<h1>Prairie City Weather</h1><p><i>Updated by hand every morning at 7 AM by Earl, who looks out the window.</i></p>`,
      `<h2>Right Now</h2><pre>TEMPERATURE ..... 41 F
SKY ............. Partly cloudy
WIND ............ Northwest, 10 mph
HUMIDITY ........ 62%
EARL'S KNEE ..... "A little achy. Rain by Thursday."</pre>`,
      `<h2>5-Day Forecast</h2><pre>DAY  FORECAST                      HIGH  LOW
---  ----------------------------  ----  ---
${days.map(([d, f, hi, lo]) => `${d}  ${f.padEnd(28)}  ${String(hi).padStart(3)}F  ${String(lo).padStart(2)}F`).join('\n')}</pre>`,
      `<h2>Weather Radar</h2><p>Our radar picture is 200 KB. At your speed that would take about <b>${radar}</b> to download. Earl suggests looking outside instead.</p>`,
      `<h2>Weather Fact of the Week</h2><p>Count the seconds between a flash of lightning and the boom of thunder, then divide by 5. That's about how many miles away the storm is, because sound travels about a mile in 5 seconds. (Light gets to you almost instantly.)</p><p>If you can hear thunder, you're close enough to be struck by lightning. Go inside!</p>`,
      back(h)
    ]};
  }, [{ title: 'PrairieNet Weather', desc: 'Prairie City forecast, updated every morning by Earl.', keywords: 'weather forecast rain snow temperature thunder lightning storm prairie city', cat: 'sci' }]);

  /* ---------- university physics department ---------- */
  reg(Y, U.physics, h => ({ title: 'PSU Department of Physics', cls: '', blocks: [
    `<h1>Prairie State University<br>Department of Physics</h1><p>Welcome to our World Wide Web server! You are one of the first people ever to read this page.</p>`,
    `<p>The Web was invented in 1989 at CERN, a big physics laboratory near Geneva, Switzerland, so that scientists could share their papers with each other. We figured a physics department had better get one too.</p><p>Our server is a computer under Professor Okafor's desk. <b>Please do not unplug it.</b> (This means you, night janitor.)</p>`,
    `<h2>People</h2><ul><li><b>Prof. Ada Okafor</b>: lasers, and the web server</li><li><b>Prof. Walt Brandvold</b>: weather balloons (if you find one in your yard, please call)</li><li><b>Dr. Priya Raman</b>: stars, galaxies, and the department coffee pot</li><li><b>Bina Patel</b>: graduate student, keeper of the ${h.A(U.cool, 'Cool Links list')}</li></ul>`,
    `<h2>Courses This Fall</h2><ul><li>PHYS 101: How Things Fall (Mostly Down)</li><li>PHYS 150: Light, Sound, and Why the Sky Is Blue</li><li>PHYS 210: Electricity (Please Don't Lick the Lab Equipment)</li></ul>`,
    `<h2>Amazing Physics Facts</h2><ul><li>Light travels about 300,000 kilometers (186,000 miles) every second. It could go around the Earth more than 7 times in one second.</li><li>Sunlight takes about 8 minutes to reach Earth. When you look at the Sun (don't!), you're seeing it as it was 8 minutes ago.</li><li>Sound is much slower: about 340 meters per second in air.</li><li>On the Moon you would weigh about one-sixth of what you weigh on Earth.</li></ul>`,
    `<p>${h.A(U.library, 'Search the PSU Library catalog')} | ${h.A(U.home, 'PrairieNet')}</p><address>physics-web@prairie-state.edu</address>`
  ]}), [{ title: 'PSU Department of Physics', desc: 'A university physics department with one of the first web servers. Light, sound and space facts.', keywords: 'physics science university college light sound moon sun cern space school', cat: 'edu' }]);

  /* ---------- Cool Links ---------- */
  reg(Y, U.cool, h => ({ title: "Bina's Cool Links", cls: '', blocks: [
    `<h1>Bina's Cool Links</h1><p>I'm keeping a list of every cool page on the World Wide Web. So far there are 14. I think I've found most of them!</p>`,
    `<h2>Useful</h2><ul><li>${h.A(U.finder, 'WebFinder')}: searches all the pages. Someday there might be too many to list by hand.</li><li>${h.A(U.news, 'The Daily Byte')}: computer news, every Friday</li><li>${h.A(U.weather, 'PrairieNet Weather')}: Earl's forecast</li><li>${h.A(U.library, 'PSU Library catalog')}: look up books without walking across campus in the snow</li><li>${h.A(U.bbs, 'Prairie Area BBS List')}: other computers you can call</li></ul>`,
    `<h2>Fun</h2><ul><li>${h.A(U.jokes, 'Joke of the Day')}: a new joke every day. Some of them are even funny.</li><li>${h.A(U.recipes, 'The Great Internet Recipe Archive')}: recipes in plain text. Try the snickerdoodles.</li><li>${h.A(U.shack, 'Shareware Shack')}: free games</li></ul>`,
    `<h2>People's Home Pages</h2><ul><li>${h.A(U.kevin, "Kevin's Totally Rad Home Page")}: a kid made a home page. It has music. I can't make it stop.</li><li>${h.A(U.dana, "Dana's Place")}: Dana likes mysteries</li><li>${h.A(U.marcus, "Marcus's Model Rocket Page")}: 3, 2, 1...</li></ul>`,
    `<h2>Science</h2><ul><li>${h.A(U.physics, 'PSU Physics')}: my department. Hi, Professor Okafor!</li></ul>`,
    `<hr><p><small>Last updated October 14, 1990. Know a cool page? Email bpatel@prairie-state.edu</small></p>${back(h)}`
  ]}), [{ title: "Bina's Cool Links", desc: 'A hand-typed list of every cool page on the Web (all 14 of them).', keywords: 'cool links list best sites fun directory hotlist', cat: 'fun' }]);

  /* ---------- recipe archive ---------- */
  const RECIPES = [
    ['snickerdoodles', "Grandma Jo's Snickerdoodles", 'Kevin (Grandma read it to me over the phone)', `MAKES: about 24 cookies
ASK A GROWN-UP TO HELP WITH THE OVEN.

1/2 cup butter, softened
3/4 cup sugar
1 egg
1/2 teaspoon vanilla
1 1/3 cups flour
1 teaspoon cream of tartar
1/2 teaspoon baking soda
1 pinch salt

TOPPING: 2 tablespoons sugar mixed with 1 teaspoon cinnamon

1. Heat the oven to 375 F.
2. Beat the butter and sugar until fluffy. Beat in the egg and vanilla.
3. Stir in the flour, cream of tartar, baking soda and salt.
4. Roll the dough into balls about 1 inch across.
5. Roll each ball in the cinnamon sugar.
6. Put them 2 inches apart on a cookie sheet.
7. Bake 8 to 10 minutes, until the edges are set.

GRANDMA SAYS: Do not eat all the dough. I know you, Kevin.`],
    ['cocoa', 'Hot Cocoa for One', 'Earl (the weather guy)', `ASK A GROWN-UP TO HELP WITH THE STOVE.

1 cup milk
2 tablespoons cocoa powder
2 tablespoons sugar
1 tiny pinch salt
1 drop vanilla

1. In a small pot, stir the cocoa, sugar and salt with a splash
   of the milk until it makes a smooth paste.
2. Stir in the rest of the milk.
3. Heat over medium-low, stirring, until it's hot but not boiling.
4. Stir in the vanilla. Pour into a mug.

EARL SAYS: Best enjoyed while looking out the window.`],
    ['antsonalog', 'Ants on a Log', 'Dana', `NO COOKING!

4 celery sticks, washed
peanut butter
raisins

1. Spread peanut butter in the groove of each celery stick.
2. Put a row of raisins on top. Those are the ants.
3. Eat the log. The ants don't mind.

ALLERGIC TO PEANUTS? Use sunflower seed butter or cream cheese.`],
    ['trailmix', "Modem Operator's Trail Mix", 'Marcus', `NO COOKING!

1 cup toasted oat cereal
1/2 cup raisins
1/2 cup pretzels
1/2 cup sunflower seeds
1/4 cup chocolate chips

1. Put everything in a paper bag.
2. Fold the top and shake.
3. Eat while you wait for a download. You'll have time.`]
  ];
  reg(Y, U.recipes, h => ({ title: 'The Great Internet Recipe Archive', cls: '', blocks: [
    `<h1>The Great Internet Recipe Archive</h1><p>Recipes from all over the Net, in plain text so they load fast. Print them out and tape them to the fridge!</p>`,
    `<h2>Recipes</h2><ul>${RECIPES.map(r => `<li>${h.A(U.recipes + r[0] + '.txt', r[1])}: sent in by ${r[2]}</li>`).join('')}</ul>`,
    `<p>Send us your recipe! Email recipes@recipe-archive.org. Plain text only, please. No pictures. Pictures take forever.</p>${back(h)}`
  ]}), [{ title: 'The Great Internet Recipe Archive', desc: 'Snickerdoodles, hot cocoa, ants on a log and trail mix, in plain text.', keywords: 'recipe recipes cookies cooking food snack cocoa snickerdoodles grandma kitchen', cat: 'fun' }]);
  SITES.push({ eras: Y, match: url => url.startsWith(U.recipes) && url.endsWith('.txt'), page: (url, h) => {
    const r = RECIPES.find(x => url === U.recipes + x[0] + '.txt');
    if (!r) return { title: '404 Not Found', cls: '', blocks: [`<h1>Not Found</h1><p>That recipe isn't in the archive. Maybe somebody ate it.</p><p>${h.A(U.recipes, 'Back to the recipe list')}</p>`] };
    return { title: r[0].toUpperCase() + '.TXT', cls: '', blocks: [`<pre>${h.esc(r[1].toUpperCase())}\nSent in by: ${h.esc(r[2])}\n${'='.repeat(40)}\n\n${h.esc(r[3])}</pre>`, `<p>${h.A(U.recipes, 'Back to the recipe list')}</p>`] };
  } });

  /* ---------- library catalog ---------- */
  const BOOKS = [
    ["Alice's Adventures in Wonderland", 'Carroll, Lewis', 1865, 'FIC CARROLL', 'fantasy', 'CHECKED OUT, due 11/02/90'],
    ['Treasure Island', 'Stevenson, Robert Louis', 1883, 'FIC STEVENSON', 'adventure pirates', 'ON SHELF'],
    ['Little Women', 'Alcott, Louisa May', 1868, 'FIC ALCOTT', 'family sisters', 'ON SHELF'],
    ['The Adventures of Tom Sawyer', 'Twain, Mark', 1876, 'FIC TWAIN', 'adventure river', 'CHECKED OUT, due 10/29/90'],
    ['Black Beauty', 'Sewell, Anna', 1877, 'FIC SEWELL', 'horses animals', 'ON SHELF'],
    ['The Jungle Book', 'Kipling, Rudyard', 1894, 'FIC KIPLING', 'animals jungle', 'ON SHELF'],
    ['The Wonderful Wizard of Oz', 'Baum, L. Frank', 1900, 'FIC BAUM', 'fantasy kansas', 'CHECKED OUT, due 11/09/90'],
    ['The Secret Garden', 'Burnett, Frances Hodgson', 1911, 'FIC BURNETT', 'garden mystery', 'ON SHELF'],
    ['Twenty Thousand Leagues Under the Sea', 'Verne, Jules', 1870, 'FIC VERNE', 'science fiction submarine ocean', 'ON SHELF'],
    ['A Christmas Carol', 'Dickens, Charles', 1843, 'FIC DICKENS', 'holiday ghosts', 'ON SHELF'],
    ['The Time Machine', 'Wells, H. G.', 1895, 'FIC WELLS', 'science fiction time travel', 'CHECKED OUT, due 11/15/90'],
    ['Modems Made Easy', 'Hayward, Jan', 1989, '004.6 HAY', 'computers modems telephone', 'MISSING (last seen under the physics web server)'],
    ['Your First Home Computer', 'Lindqvist, Tom', 1988, '004.16 LIN', 'computers beginners', 'ON SHELF'],
    ['How Things Fall (Mostly Down)', 'Brandvold, Walt', 1987, '531 BRA', 'physics gravity textbook', 'ON RESERVE for PHYS 101']
  ];
  reg(Y, U.library, h => ({ title: 'PSUCAT: Library Catalog', cls: '', blocks: [
    `<h1>PSUCAT</h1><p><b>Prairie State University Library Online Catalog</b><br>Search by title, author or subject. No need to flip through the card catalog!</p>`,
    `<form data-lib><pre style="margin:0">ENTER SEARCH WORDS:</pre><input type="text" name="q" size="30" aria-label="Search the catalog"> <button class="btn" type="submit">Search</button> <button class="btn" type="button" data-all>List all</button></form>`,
    `<pre data-out style="white-space:pre-wrap">Try: treasure, twain, science fiction, computers, animals</pre>`,
    `<p><small>The library is open 8 AM to 10 PM. The catalog is open 24 hours, because computers don't get sleepy.</small></p><p>${h.A(U.physics, 'PSU Physics')} | ${h.A(U.home, 'PrairieNet')}</p>`
  ], after(root) {
    const f = root.querySelector('[data-lib]'), out = root.querySelector('[data-out]');
    const show = list => { out.textContent = list.length ? `${list.length} RECORD(S) FOUND\n\n` + list.map((b, i) => `${String(i + 1).padStart(2)}. ${b[0]}\n    AUTHOR: ${b[1]}   YEAR: ${b[2]}\n    CALL NO: ${b[3]}   STATUS: ${b[5]}`).join('\n\n') : 'NO RECORDS FOUND. CHECK YOUR SPELLING, OR ASK A LIBRARIAN. THEY KNOW EVERYTHING.'; };
    f.onsubmit = e => { e.preventDefault(); const w = f.q.value.toLowerCase().split(/\s+/).filter(Boolean); if (!w.length) return; show(BOOKS.filter(b => w.every(x => (b[0] + ' ' + b[1] + ' ' + b[4]).toLowerCase().includes(x)))); };
    root.querySelector('[data-all]').onclick = () => show(BOOKS);
  }}), [{ title: 'PSUCAT: Prairie State University Library Catalog', desc: 'Search the library card catalog online. Classic books and computer manuals.', keywords: 'library books catalog read reading authors novels twain treasure island alice oz school university', cat: 'edu' }]);

  /* ---------- joke of the day ---------- */
  const JOKES = [
    ['Why did the scarecrow win an award?', 'Because he was outstanding in his field.'],
    ['What do you call a fish with no eyes?', 'A fsh.'],
    ["Why can't a bicycle stand up by itself?", "It's two tired."],
    ['What did one wall say to the other wall?', "I'll meet you at the corner."],
    ['Why did the math book look sad?', 'It had too many problems.'],
    ['What do you call a sleeping dinosaur?', 'A dino-snore.'],
    ["Why don't eggs tell jokes?", "They'd crack each other up."],
    ["What has keys but can't open locks?", 'A piano. (And a computer keyboard!)'],
    ['Why was the computer tired when it got home?', 'It had a hard drive.'],
    ['How does the ocean say hello?', 'It waves.'],
    ['What kind of tree fits in your hand?', 'A palm tree.'],
    ['What do you call a bear with no teeth?', 'A gummy bear.'],
    ['Why did the cookie go to the doctor?', 'It felt crummy.'],
    ['What did the spider do on the computer?', 'Made a web site!'],
    ['Why did the student eat his homework?', 'The teacher said it was a piece of cake.']
  ];
  reg(['1990', '1995'], U.jokes, h => {
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
    const n = day % JOKES.length;
    const w95 = h.era().id === '1995';
    return { title: 'Joke of the Day', cls: w95 ? 'w95' : '', blocks: [
      `<h1${w95 ? ' style="font-family:Arial;color:#c00;text-align:center"' : ''}>Joke of the Day</h1><p${w95 ? ' style="text-align:center"' : ''}>A brand-new joke every day! (We have ${JOKES.length} jokes. Then they start over.)</p>`,
      `<div data-joke style="border:3px double #000;background:#ffffe0;padding:10px 14px;max-width:32rem;margin:auto"><p><b data-q></b></p><p data-a style="visibility:hidden"></p><p><button class="btn" data-show>Show the punchline</button> <button class="btn" data-next>Another joke</button></p></div>`,
      `<p><small>Jokes read on this computer: <span data-count></span>. Groans heard: probably more.</small></p>${w95 ? `<p>${h.A('http://www.prairienet.com/kids/', 'Back to Kids Only')}</p>` : back(h)}`
    ], after(root) {
      let i = n;
      const q = root.querySelector('[data-q]'), a = root.querySelector('[data-a]'), c = root.querySelector('[data-count]');
      const show = () => { q.textContent = JOKES[i][0]; a.textContent = JOKES[i][1]; a.style.visibility = 'hidden'; const k = h.store.get('jokesRead', 0) + 1; h.store.set('jokesRead', k); c.textContent = k; };
      root.querySelector('[data-show]').onclick = () => { a.style.visibility = 'visible'; };
      root.querySelector('[data-next]').onclick = () => { i = (i + 1) % JOKES.length; show(); };
      show();
    }};
  }, [{ title: 'Joke of the Day', desc: 'A new clean joke every day, with a punchline button.', keywords: 'joke jokes funny laugh humor riddle kids', cat: 'fun' }]);

  /* ---------- BBS directory ---------- */
  reg(Y, U.bbs, h => ({ title: 'Prairie Area BBS List', cls: '', blocks: [
    `<h1>Prairie Area BBS List</h1><p>A <b>BBS</b> (bulletin board system) is a computer that you call directly with your modem. You can leave messages, play games and download files. Most have only one or two phone lines, so only one or two people can be on at a time. If it's busy, try again later!</p>`,
    `<pre>NAME                    NUMBER     SPEED  HOURS       NOTES
----------------------  --------   -----  ----------  ------------------------------
The Grain Elevator      555-0118    2400  24 hours    Farm talk, weather, recipes
The Byte Barn           555-0167    2400  24 hours    Shareware files, 40 MB (!!)
Sysop Sally's Place     555-0133    1200  24 hours    One line. Busy 90% of the time
Prairie High Homework   555-0150    2400  Sun 6-9 PM  Homework help. No games. Sorry
The Silicon Silo        555-0199    9600  24 hours    Door games! Space trading game
Midnight Modem Madness  555-0124    2400  11PM-6AM    Night owls only
Kansas Knitting Circle  555-0171     300  9 AM-5 PM   Patterns. Grandma Jo is a member</pre>`,
    `<h2>BBS Manners</h2><ul><li>Don't stay on for hours. Other people are waiting to call.</li><li>Write in regular letters. WRITING IN ALL CAPITALS LOOKS LIKE SHOUTING.</li><li>A BBS that is long distance costs money every minute. Ask before you call!</li></ul>`,
    `<p>${h.APP('dial', 'Open Dial-Up Connection')}</p>${back(h)}`
  ]}), [{ title: 'Prairie Area BBS List', desc: 'Phone numbers for bulletin board systems you can call with your modem.', keywords: 'bbs bulletin board system modem dial phone numbers sysop door games', cat: 'fun' }]);

  /* ---------- the Cool Kids Web Ring: Dana and Marcus ---------- */
  reg(Y, U.dana, h => ({ title: "Dana's Place", cls: 'kev', blocks: [
    `<h1>Dana's Place</h1><p class="center">Hi!!! I'm Dana. I'm 12 and I live in Ohio. Kevin showed me how to make a home page. Mine has NO music, on purpose.</p>`,
    `<h2 style="color:#0f0">Stuff I Like</h2><ul><li>Mysteries, UFOs and anything unexplained</li><li>Drawing</li><li>My sticker collection (412 stickers)</li><li>Beating Kevin at Worm</li></ul>`,
    `<h2 style="color:#0f0">Mystery of the Week</h2><p>Why does the modem always disconnect RIGHT when my download is almost done? I have a theory: it's my brother. He picks up the phone.</p>`,
    `<p class="center">[ ${h.A(U.marcus, '&lt;&lt; Prev')} | Cool Kids Web Ring | ${h.A(U.kevin, 'Next &gt;&gt;')} ]</p><p class="center">${h.A(U.cool, 'Cool Links')} | ${h.A(U.home, 'PrairieNet')}</p>`
  ]}), [{ title: "Dana's Place", desc: 'Dana, age 12, likes mysteries, UFOs, drawing and stickers.', keywords: 'dana home page personal ufo mystery stickers ohio kids web ring', cat: 'fun' }]);
  reg(Y, U.marcus, h => ({ title: "Marcus's Model Rocket Page", cls: '', blocks: [
    `<h1>Marcus's Model Rocket Page</h1><p>5... 4... 3... 2... 1... LIFTOFF! I build model rockets with my dad. Here are my rockets.</p>`,
    `<pre>ROCKET              HOW HIGH     WHAT HAPPENED
------------------  -----------  -----------------------------
The Screaming Eagle  about 300 ft  Came down in a tree. Still there.
Prairie Dog I        about 500 ft  Perfect landing! Parachute worked!
Big Bertha Jr.       about 20 ft   Tipped over. We don't talk about it.</pre>`,
    `<h2>Rocket Safety</h2><ul><li>Always launch with a grown-up, outside, in a big open field.</li><li>Stay back from the launch pad and use an electric launcher.</li><li>Never launch near trees or power lines. (See: The Screaming Eagle.)</li></ul>`,
    `<h2>Rocket Fact</h2><p>The first rocket that burned liquid fuel was launched in 1926 in Massachusetts. It flew for about two and a half seconds. Mine flew longer than that!</p>`,
    `<p>[ ${h.A(U.kevin, '&lt;&lt; Prev')} | Cool Kids Web Ring | ${h.A(U.dana, 'Next &gt;&gt;')} ]</p>${back(h)}`
  ]}), [{ title: "Marcus's Model Rocket Page", desc: 'Model rockets, launch results and rocket safety.', keywords: 'rocket rockets model space launch science kids web ring', cat: 'sci' }]);

  /* ---------- WebFinder categories (the WebFinder page links to these) ---------- */
  const CATS = { arts: ['Arts', 41], edu: ['Education', 93], sci: ['Science', 126], sports: ['Sports', 38], fun: ['Fun Stuff', 371] };
  SITES.push({ eras: Y, match: url => /^http:\/\/www\.webfinder\.com\/(arts|edu|sci|sports|fun)\/$/.test(url), page: (url, h) => {
    const id = url.split('/')[3], [name, n] = CATS[id];
    const list = ENTRIES.filter(e => e.cat === id);
    return { title: 'WebFinder: ' + name, cls: 'dir', blocks: [
      `<h1 style="color:#800000;font-style:italic">WebFinder</h1><h2>${name} (${n})</h2>`,
      list.length ? `<ul>${list.map(e => `<li>${h.A(e.url, h.esc(e.title))}: ${h.esc(e.desc)}</li>`).join('')}</ul><p><small>...and ${n - list.length} more we haven't typed in yet.</small></p>` : `<p>We have ${n} ${name.toLowerCase()} pages, but our typist is on vacation. Try ${h.A(U.news, 'The Daily Byte')} instead.</p>`,
      `<p>${h.A(U.finder, 'Back to WebFinder')}</p>`
    ]};
  } });
})();
