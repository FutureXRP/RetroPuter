/* More of the 1995 Web: CyberBurbs member pages, web rings, a kids zone, an encyclopedia,
   movie times, a hit-counter shop, an online store and dancing gerbils.
   Each page registers on window.RETRO_SITES (see js/web/README.md). */
(function () {
  'use strict';
  const SITES = (window.RETRO_SITES = window.RETRO_SITES || []);
  const Y = ['1995'];
  const CB = 'http://www.cyberburbs.com/';
  const U = {
    home: 'http://www.prairienet.com/', finder: 'http://www.webfinder.com/', news: 'http://www.dailybyte.com/', shack: 'http://www.shareware-shack.com/',
    fish: 'http://www.prairienet.com/cool/fishcam.html', kevin: CB + 'siliconhills/4077/', cyber: CB,
    weather: 'http://www.prairienet.com/weather/', kids: 'http://www.prairienet.com/kids/', jokes: 'http://www.jokeoftheday.com/',
    dana: CB + 'hollywood/2112/', hamster: CB + 'petsburgh/3301/', gerbils: CB + 'petsburgh/2222/', pound: CB + 'petsburgh/5150/',
    static: CB + 'sunsetstrip/1234/', floppy: CB + 'sunsetstrip/5678/', minivan: CB + 'sunsetstrip/9012/', guest: CB + 'heartland/7070/',
    ring: 'http://www.ringmaster-net.com/', pedia: 'http://www.infosphere-online.com/', movies: 'http://www.prairie6cinemas.com/',
    counter: 'http://www.countermania.com/', shop: 'http://www.shoptron95.com/'
  };
  const ENTRIES = [];
  function reg(url, page, search, eras = Y) {
    const s = (search || []).map(e => Object.assign({ url }, e));
    s.forEach(e => ENTRIES.push(e));
    SITES.push({ eras, url, page: (u, h) => page(h, u), search: s });
  }
  const A = (h, u, t) => h.A(u, t);
  const style = css => `<style>${css}</style>`;
  // a guestbook that belongs to one page (h.gb's own storage is Kevin's)
  function gbook(h, key, defaults) {
    return {
      html: () => h.gb.html(h.store.get(key, defaults)),
      count: () => h.store.get(key, defaults).length,
      bind(root, nv, url) {
        const f = root.querySelector('[data-sign]'); if (!f) return;
        f.onsubmit = e => {
          e.preventDefault();
          const list = h.store.get(key, defaults);
          list.push({ n: f.n.value.trim().slice(0, 30), w: f.w.value.trim().slice(0, 30) || 'The Internet', m: f.m.value.trim().slice(0, 200) });
          h.store.set(key, list.slice(-60)); nv.nav(url, 'reload');
        };
      }
    };
  }
  const stopBtn = (label = 'Stop the music') => `<p style="text-align:center"><button class="btn" data-stopmusic>${label}</button></p>`;
  const bindStop = (root, h) => { const b = root.querySelector('[data-stopmusic]'); if (b) b.onclick = () => { h.stopMusic('web'); b.disabled = true; b.textContent = 'Music stopped'; }; };
  const px = (rows, pal, s = 4, extra = '') => {
    const H = rows.length, Wd = rows[0].length; let r = '';
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (pal[row[x]]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[row[x]]}"/>`; });
    return `<svg width="${Wd * s}" height="${H * s}" viewBox="0 0 ${Wd} ${H}" shape-rendering="crispEdges" ${extra}>${r}</svg>`;
  };

  /* ---------- weather, now with radar ---------- */
  const RADAR = `<svg class="img" data-kb="45" width="320" height="200" viewBox="0 0 80 50" style="max-width:100%"><rect width="80" height="50" fill="#123"/><path d="M0 30 L20 28 L35 33 L50 27 L80 29" stroke="#567" fill="none"/><path d="M40 0 V50 M0 25 H80" stroke="#234"/><circle cx="40" cy="25" r="10" fill="none" stroke="#2a4"/><circle cx="40" cy="25" r="20" fill="none" stroke="#2a4"/><ellipse cx="22" cy="18" rx="9" ry="5" fill="#2c2" opacity=".8"/><ellipse cx="25" cy="18" rx="4" ry="2.5" fill="#ee2"/><ellipse cx="26" cy="18" rx="1.5" ry="1" fill="#e22"/><ellipse cx="58" cy="36" rx="6" ry="3" fill="#2c2" opacity=".7"/><circle cx="40" cy="25" r="1" fill="#fff"/><text x="2" y="48" font-size="4" fill="#9cf" font-family="monospace">PRAIRIE CITY RADAR 4:15 PM</text></svg>`;
  reg(U.weather, h => ({ title: 'PrairieNet WeatherWatch', cls: 'w95', blocks: [
    `<div class="hdr">PrairieNet WeatherWatch<small>Now with a real radar picture! Earl still looks out the window, just to be sure.</small></div>`,
    `<table width="100%"><tr><td>${RADAR}<p><small>Green is rain. Yellow is heavy rain. Red is "stay inside."</small></p></td><td><h2 style="font-family:Arial">Right Now</h2><p><b>63&deg;F</b>, cloudy<br>Wind: south, 15 mph<br>Storms possible after 6 PM</p><p><b>Earl says:</b> "Bring the lawn chairs in."</p></td></tr></table>`,
    `<h2 style="font-family:Arial">5-Day Forecast</h2><table border="1" cellpadding="6" style="border-collapse:collapse;text-align:center"><tr><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr><tr><td>Storms<br>70/52</td><td>Clearing<br>66/48</td><td>Sunny<br>72/50</td><td>Sunny<br>75/55</td><td>Windy<br>68/49</td></tr></table>`,
    `<div class="cool"><b>Storm Safety:</b> A <b>tornado watch</b> means the weather could make tornadoes, so keep an eye on the sky and the radio. A <b>tornado warning</b> means a tornado has been seen or shows up on radar. Go to a basement or an inside room with no windows right away!</div>`,
    `<p>${A(h, U.home, 'Back to PrairieNet')} | ${A(h, U.kids, 'Kids Only')}</p>`
  ]}), [{ title: 'PrairieNet WeatherWatch', desc: 'Forecast and a live radar picture for Prairie City. Tornado safety tips.', keywords: 'weather forecast radar storm tornado rain temperature', cat: 'news' }]);

  /* ---------- kids zone ---------- */
  const DOT = px(['..kk....kk..', '.kttk..kttk.', '.kttkkkkttk.', '..kwwwwwwk..', '..wkwwwwkw..', '..wwwwwwww..', '...wwkkww...', '...wwrrww...', '....wwww....', '...rrrrrr...', '..wwwwwwww..', '..ww....ww..'], { k: '#222', t: '#c96', w: '#fff', r: '#e22' }, 6, 'class="img" data-kb="8" style="display:inline-block;vertical-align:middle"');
  reg(U.kids, h => ({ title: 'PrairieNet Kids Only!', cls: 'w95', blocks: [
    style('.wxk{background:#ffffc0}.wxk h1{font:900 34px "Comic Sans MS",cursive;color:#f60;text-align:center;text-shadow:2px 2px 0 #009;margin:.2em 0}.wxk .tile{display:inline-block;vertical-align:top;width:180px;margin:6px;padding:8px;border:3px solid #09f;background:#fff;border-radius:10px;font-family:Arial}'),
    `<div class="wxk"><h1>KIDS ONLY!</h1><p style="text-align:center">${DOT}<br><b>Hi! I'm Dot the Dial-Up Dog.</b> Woof! (That's modem for "welcome.")</p></div>`,
    `<div class="wxk" style="text-align:center">
      <div class="tile"><b>Animals</b><br>${A(h, U.hamster, "Nibbles the Hamster")}<br>${A(h, U.gerbils, 'The Gerbil Jamboree')}<br>${A(h, U.pound, 'Adopt a Pixel Pet')}<br>${A(h, U.fish, 'The FishCam')}</div>
      <div class="tile"><b>Learn Stuff</b><br>${A(h, U.pedia, 'InfoSphere Encyclopedia')}<br>${A(h, U.weather, 'Weather and storm safety')}</div>
      <div class="tile"><b>Laugh</b><br>${A(h, U.jokes, 'Joke of the Day')}<br>${A(h, U.movies, "What's playing at the movies")}</div>
      <div class="tile"><b>Make Stuff</b><br>${h.APP('paint', 'Draw a picture in Paintbox')}<br>${h.APP('pagebuilder', 'Build your own home page!')}<br>${A(h, U.cyber, 'Visit CyberBurbs')}</div>
    </div>`,
    `<div class="wxk"><h2 style="font-family:Arial;color:#009">Dot's Rules for Safe Surfing</h2><ol><li>Never tell anyone online your last name, address, phone number or school.</li><li>Never send a picture of yourself without asking a grown-up.</li><li>Never agree to meet someone you met online.</li><li>If something online makes you feel weird or scared, tell a grown-up right away. You won't be in trouble.</li><li>Ask before you download anything.</li></ol></div>`,
    `<p>${A(h, U.home, 'Back to PrairieNet')}</p>`
  ]}), [{ title: 'PrairieNet Kids Only!', desc: 'Games, animals, jokes and safe-surfing rules from Dot the Dial-Up Dog.', keywords: 'kids children fun games safe safety surfing animals jokes dot', cat: 'edu' }]);

  /* ---------- Dana's fan page for an (original) TV show ---------- */
  const SPOOKY = { mel: [69, 0, 76, 0, 74, 72, 74, 0, 69, 0, 76, 0, 79, 77, 76, 0], bass: [45, 45, 41, 40], step: 0.22, lead: 'triangle', leadVol: 0.07, harm: 12 };
  reg(U.dana, h => ({ title: "Dana's Unexplained Files Fan Page", cls: 'kev95', music: SPOOKY, blocks: [
    style('.wxd h1{font:700 30px "Courier New",monospace;letter-spacing:3px}.wxd.case,.wxd .case{border:2px dashed #0f0;padding:6px 10px;margin:8px 0}.wxd table td,.wxd table th{padding:3px 8px;border-bottom:1px dotted #0a0;text-align:left}'),
    `<div class="wxd"><h1>THE UNEXPLAINED FILES</h1><p class="center"><i>~ The Unofficial Fan Page, by Dana ~</i></p><div class="mq" style="background:#000;border-color:#0f0"><span style="color:#0f0">*** CASE FILE OPEN *** SOMEBODY EXPLAIN THIS *** NEW EPISODE FRIDAY AT 9 ***</span></div></div>`,
    `<div class="wxd frame"><p>It's the best show on TV. Every week, investigators <b>Rosa Quill</b> (a scientist who doesn't believe ANYTHING) and <b>Theo Marsh</b> (a former magician who believes EVERYTHING) from the Department of Odd Occurrences look into weird stuff. It is always a little bit spooky and usually turns out to be the weather.</p></div>`,
    `<div class="wxd"><h2 style="color:#ff0">Season 2 Episode Guide</h2><table><tr><th>#</th><th>Episode</th><th>What it really was</th><th>Dana's rating</th></tr>
      ${[['1', 'The Lights Over Pennyworth Lake', 'A blimp', '4/5'], ['2', 'Crop Circles in Aisle 5', "The grocery store's floor polisher", '3/5'], ['3', 'The Man Who Could Hear Modems', 'He could. It was never explained!!', '5/5'], ['4', "Bigfoot's Cousin", 'A very tall man in a fur coat', '4/5'], ['5', 'The Toaster Incident', 'Unexplained (toast is still missing)', '5/5']].map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`,
    `<div class="wxd case"><b>DANA'S OWN CASE FILE #7:</b> Every night at 9:02 PM, our modem disconnects. I have ruled out aliens. Main suspect: my brother, who calls his girlfriend at 9:02 PM. Case closed.</div>`,
    `<div class="ring">This site is a member of the <b>Unexplained Web Ring</b><br>[ ${A(h, U.ring, 'Ring Hub')} | Members: 1 (just me) | ${A(h, U.dana, 'Next')} ]</div><p class="center">${A(h, U.cyber, 'CyberBurbs Hollywood')} | Theme music written by me on my keyboard</p>${stopBtn('Stop the spooky music')}`
  ], after(root) { bindStop(root, h); } }), [{ title: "Dana's Unexplained Files Fan Page", desc: 'Episode guide and theories for the TV show The Unexplained Files.', keywords: 'unexplained files tv show fan page dana mystery ufo spooky aliens episode guide', cat: 'tv' }]);

  /* ---------- Nibbles the hamster ---------- */
  const HAMPIC = px(['...oo......oo...', '..opo......opo..', '..oooooooooooo..', '.oooooooooooooo.', '.oookooooookooo.', 'ooooooopooooooo.', 'wwwoooooooooowww', 'wwwwwwwwwwwwwwww', '.wwwwwwwwwwwwww.', '..wwwwwwwwwwww..', '...tt......tt...'], { o: '#e8912c', p: '#f7a', k: '#000', w: '#fff5e0', t: '#f7a' }, 8, 'class="img" data-kb="20" style="max-width:100%"');
  reg(U.hamster, h => ({ title: "Nibbles the Hamster's Home Page", cls: 'w95', blocks: [
    style('.wxh{background:#fff0d0;font-family:"Comic Sans MS",cursive}.wxh h1{color:#c60;text-align:center}'),
    `<div class="wxh"><h1>Nibbles the Hamster's Home Page</h1><p style="text-align:center">${HAMPIC}</p><p style="text-align:center">This is my hamster Nibbles. He is a golden hamster. This page is by me, Tyler (age 10).</p></div>`,
    `<div class="wxh"><h2>Nibbles' Diary</h2><ul><li><b>Monday:</b> Ran on his wheel all night. Squeak squeak squeak.</li><li><b>Tuesday:</b> Ran on his wheel all night. Mom says we need to oil it.</li><li><b>Wednesday:</b> Stuffed 11 sunflower seeds in his cheeks. A new record!</li><li><b>Thursday:</b> Escaped. Found in the sock drawer.</li></ul></div>`,
    `<div class="wxh"><h2>Hamster Facts</h2><ul><li>Hamsters carry food in stretchy cheek pouches that go all the way back to their shoulders.</li><li>A hamster's front teeth never stop growing, so it needs wooden things to chew.</li><li>Hamsters are most awake at night. That's why the wheel squeaks at 2 AM.</li><li>Golden hamsters like to live alone. Two grown-up golden hamsters in one cage will fight.</li><li>Most pet hamsters live about 2 to 3 years, so give them lots of love.</li></ul></div>`,
    `<div class="ring">Hamster &amp; Gerbil Web Ring: [ ${A(h, U.pound, 'Prev')} | ${A(h, U.ring, 'Hub')} | ${A(h, U.gerbils, 'Next')} ]</div><p>${A(h, U.kids, 'PrairieNet Kids Only')} | ${A(h, U.cyber, 'CyberBurbs Petsburgh')}</p>`
  ]}), [{ title: "Nibbles the Hamster's Home Page", desc: "Tyler's golden hamster Nibbles: his diary and true hamster facts.", keywords: 'hamster hamsters pet pets animal nibbles facts cheek pouches rodent', cat: 'pets' }]);

  /* ---------- The Gerbil Jamboree (dancing gerbils, original tune) ---------- */
  const GERB = { mel: [76, 76, 79, 76, 81, 79, 76, 74, 72, 72, 76, 72, 74, 76, 72, 0, 76, 76, 79, 76, 81, 79, 76, 79, 84, 83, 81, 79, 77, 76, 74, 72], bass: [48, 48, 53, 55, 48, 45, 53, 55], step: 0.12, lead: 'square', leadVol: 0.03, harm: 12, drums: 'four' };
  const gerbFrame = (arms) => ['....nn..........', '...nnnn.........', '..nnnknnn.......', '..nnnnnnnp......', '...nnnnnn.......', (arms ? '.t.nttttn.t.....' : '...nttttn.......'), (arms ? '..tnttttnt......' : '..tnttttnt......'), '...nnnnnn.......', '...nnnnnnn......', '...n....n.nnnn..', (arms ? '..t......t......' : '...t....t.......')];
  const gpal = { n: '#b07030', t: '#f0d0a0', k: '#000', p: '#f79' };
  const GERBIL = `<span class="wxg-g"><span class="wxg-a">${px(gerbFrame(false), gpal, 3)}</span><span class="wxg-b">${px(gerbFrame(true), gpal, 3)}</span></span>`;
  reg(U.gerbils, h => {
    const n = h.store.get('gerbils', 24);
    return { title: 'The Gerbil Jamboree!!!', cls: 'w95', music: GERB, blocks: [
      style('@keyframes wxg-a{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes wxg-b{0%,49%{opacity:0}50%,100%{opacity:1}}@keyframes wxg-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}.wxg{background:#ffe0f8;text-align:center;font-family:"Comic Sans MS",cursive}.wxg-g{position:relative;display:inline-block;width:48px;height:33px;margin:2px;animation:wxg-hop var(--wxg,.48s) steps(2) infinite}.wxg-g:nth-child(even){animation-delay:calc(var(--wxg,.48s) / -2)}.wxg-a,.wxg-b{position:absolute;left:0;top:0;animation:wxg-a var(--wxg,.48s) steps(1) infinite}.wxg-b{animation-name:wxg-b}.wxg-g:nth-child(even) .wxg-a,.wxg-g:nth-child(even) .wxg-b{animation-delay:calc(var(--wxg,.48s) / -2)}.wxg h1{font:900 36px "Comic Sans MS",cursive;color:#f0c;text-shadow:2px 2px 0 #60f}@media (prefers-reduced-motion:reduce){.wxg-g,.wxg-a,.wxg-b{animation:none}.wxg-b{opacity:0}}'),
      `<div class="wxg"><h1>THE GERBIL JAMBOREE!!!</h1><p>They dance. They never stop. Nobody knows why.</p></div>`,
      `<div class="wxg" data-floor>${GERBIL.repeat(n)}</div>`,
      `<div class="wxg"><p><b>Gerbils dancing right now: <span data-n>${n}</span></b></p><p><button class="btn" data-add>Add a gerbil</button> <button class="btn" data-fast>Faster!!!</button> <button class="btn" data-stopmusic>Stop the music</button></p><p><small>Gerbil fact: gerbils come from deserts and dry grasslands, and they love to dig tunnels. Unlike golden hamsters, gerbils like living in pairs or small groups. So technically this is a very big group.</small></p></div>`,
      `<div class="ring">Hamster &amp; Gerbil Web Ring: [ ${A(h, U.hamster, 'Prev')} | ${A(h, U.ring, 'Hub')} | ${A(h, U.pound, 'Next')} ]</div><p style="text-align:center">You are gerbil fan #<span class="counter">${String(h.store.get('gerbHits', 81234) + 1).padStart(7, '0')}</span></p>`
    ], after(root) {
      h.store.set('gerbHits', h.store.get('gerbHits', 81234) + 1);
      const floor = root.querySelector('[data-floor]'), nEl = root.querySelector('[data-n]');
      let tempo = 1;
      root.querySelector('[data-add]').onclick = () => {
        const k = Math.min(h.store.get('gerbils', 24) + 1, 200); h.store.set('gerbils', k);
        floor.insertAdjacentHTML('beforeend', GERBIL); nEl.textContent = k;
      };
      root.querySelector('[data-fast]').onclick = () => {
        tempo = tempo >= 2.5 ? 1 : tempo + 0.5;
        root.style.setProperty('--wxg', (0.48 / tempo).toFixed(2) + 's');
        h.playMusic(Object.assign({}, GERB, { step: GERB.step / tempo }));
        root.querySelector('[data-fast]').textContent = tempo === 1 ? 'Faster!!!' : tempo >= 2.5 ? 'Back to normal' : 'EVEN FASTER!!!';
      };
      bindStop(root, h);
    }};
  }, [{ title: 'The Gerbil Jamboree!!!', desc: 'Dozens of dancing gerbils and a very catchy song. You have been warned.', keywords: 'gerbil gerbils dance dancing funny silly song music animals hamster', cat: 'pets' }]);

  /* ---------- Adopt-a-Pixel Pet Pound ---------- */
  const PETS = [
    ['puppy', 'Puppy', ['.nn....nn.', 'nttnnnnttn', '.ntttttttn', '.tktttktt.', '.tttkkttt.', '..ttrrtt..', '...tttt...'], { n: '#8b4513', t: '#e0b070', k: '#000', r: '#e33' }],
    ['kitty', 'Kitty', ['.k......k.', '.kk....kk.', '.kSSSSSSk.', 'kSgSSSSgSk', 'kSSSppSSSk', '.kSSSSSSk.', '..kkkkkk..'], { k: '#000', S: '#999', g: '#3c3', p: '#f8a' }],
    ['bunny', 'Bunny', ['..w....w..', '..wp..pw..', '..wp..pw..', '.wwwwwwww.', '.wkwwwwkw.', '.wwwppwww.', '..wwwwww..'], { w: '#fff', p: '#fac', k: '#000' }],
    ['dragon', 'Tiny Dragon', ['.......gg.', 'g.....ggkg', 'gg...ggggg', '.gggggggg.', '..gggggg..', '..gy..gy..', '..g....g..'], { g: '#2b2', k: '#000', y: '#ff0' }],
    ['fishy', 'Fishy', ['..........', '...oooo..o', '.ooooooooo', 'okoooooooo', '.ooooooooo', '...oooo..o', '..........'], { o: '#f80', k: '#000' }],
    ['robot', 'Robo-Pet', ['....r.....', '..ssssss..', '..sbssbs..', '..ssssss..', '.ssskksss.', '..ssssss..', '..s....s..'], { r: '#f22', s: '#aab', b: '#0cf', k: '#333' }]
  ];
  const petSvg = (p, s = 6) => px(p[2], p[3], s);
  reg(U.pound, h => {
    const mine = h.store.get('adopted', []);
    return { title: 'Adopt-a-Pixel Pet Pound', cls: 'w95', blocks: [
      style('.wxp{font-family:Arial}.wxp h1{color:#093;text-align:center}.wxp .pens{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.wxp .pen{border:3px ridge #9c6;background:#efe;padding:6px;text-align:center;width:110px}.wxp .pen.on{background:#ff9;border-color:#f90}.wxp .cert{border:6px double #c90;background:#fffbe8;padding:10px;text-align:center;max-width:26rem;margin:10px auto;font-family:Georgia,serif}'),
      `<div class="wxp"><h1>Adopt-a-Pixel Pet Pound</h1><p style="text-align:center">These little GIFs have no home page to live on. Give one a name and a loving home today!</p></div>`,
      `<div class="wxp"><div class="pens">${PETS.map((p, i) => `<button class="pen" data-pet="${i}" aria-label="${p[1]}">${petSvg(p)}<br><b>${p[1]}</b></button>`).join('')}</div>
        <p style="text-align:center"><label>Name your pet: <input type="text" maxlength="20" data-name aria-label="Pet name"></label> <button class="btn" data-adopt>Adopt!</button></p><div data-cert></div></div>`,
      `<div class="wxp"><h2>My Adopted Pets (${mine.length})</h2><p data-mine>${mine.length ? mine.map(m => { const p = PETS[m.p] || PETS[0]; return `<span style="display:inline-block;text-align:center;margin:4px">${petSvg(p, 4)}<br>${h.esc(m.n)}</span>`; }).join('') : 'None yet. They are waiting for you!'}</p></div>`,
      `<div class="wxp"><h2>Guestbook highlights</h2><div class="gb-entry"><b>Kevin</b> from Silicon Hills wrote:<br>Pets that live on the Internet?? This could be a real business someday.</div><div class="gb-entry"><b>Grandma Jo</b> from Kansas wrote:<br>I adopted the kitty. How do I feed it.</div></div>`,
      `<div class="ring">Hamster &amp; Gerbil Web Ring: [ ${A(h, U.gerbils, 'Prev')} | ${A(h, U.ring, 'Hub')} | ${A(h, U.hamster, 'Next')} ]</div>`
    ], after(root, nv) {
      let pick = -1;
      root.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { pick = +b.dataset.pet; root.querySelectorAll('[data-pet]').forEach(x => x.classList.toggle('on', x === b)); });
      root.querySelector('[data-adopt]').onclick = () => {
        const name = root.querySelector('[data-name]').value.trim().slice(0, 20);
        const out = root.querySelector('[data-cert]');
        if (pick < 0) { out.innerHTML = '<p style="text-align:center;color:#c00">Click a pet first!</p>'; return; }
        if (!name) { out.innerHTML = '<p style="text-align:center;color:#c00">Every pet needs a name!</p>'; return; }
        const list = h.store.get('adopted', []); list.push({ p: pick, n: name }); h.store.set('adopted', list.slice(-12));
        out.innerHTML = `<div class="cert"><b style="font-size:20px">Certificate of Adoption</b><br>${petSvg(PETS[pick], 8)}<br>This certifies that <b>${h.esc(name)}</b> the ${PETS[pick][1]} has been adopted by <b>${h.esc(h.user)}</b>.<br><small>Please keep your pixel pet on your home page. Feed it bandwidth daily.</small><br><button class="btn" data-again>See all my pets</button></div>`;
        out.querySelector('[data-again]').onclick = () => nv.nav(U.pound, 'reload');
      };
    }};
  }, [{ title: 'Adopt-a-Pixel Pet Pound', desc: 'Adopt a homeless GIF pet, name it, and get a certificate.', keywords: 'adopt pet pets virtual pixel gif puppy kitty bunny dragon robot', cat: 'pets' }]);

  /* ---------- garage bands and their web ring ---------- */
  const BANDS = [U.static, U.kevin, U.minivan, U.floppy];
  const bandRing = (h, url) => { const i = BANDS.indexOf(url), n = BANDS.length; return `<div class="ring">This site is a member of the <b>Garage Band Web Ring</b><br>[ ${A(h, BANDS[(i + n - 1) % n], 'Prev')} | <a href="#" data-randring>Random</a> | ${A(h, BANDS[(i + 1) % n], 'Next')} | ${A(h, U.ring, 'Ring Hub')} ]</div>`; };
  const bindRing = (root, nv, url) => { const r = root.querySelector('[data-randring]'); if (r) r.onclick = e => { e.preventDefault(); e.stopPropagation(); const o = BANDS.filter(b => b !== url); nv.nav(o[Math.random() * o.length | 0]); }; };
  const LOUD = { mel: [52, 52, 55, 52, 57, 55, 52, 50, 52, 52, 55, 52, 59, 57, 55, 57], bass: [40, 40, 43, 45], step: 0.14, lead: 'sawtooth', leadVol: 0.025, bassType: 'square', bassVol: 0.05, drums: 'four' };
  reg(U.static, h => ({ title: 'STATIC CLING: Official Band Page', cls: 'kev95', music: LOUD, blocks: [
    `<h1 style="font-size:40px;color:#f00;text-shadow:0 0 8px #ff0">STATIC CLING</h1><p class="center"><b>THE LOUDEST BAND IN TEXAS (OUR NEIGHBORS AGREE)</b></p>`,
    `<div class="frame"><h2 style="color:#ff0">The Band</h2><ul><li><b>DoomDude</b>: guitar, yelling</li><li><b>Big Tony</b>: drums (his mom's pots and pans)</li><li><b>Ashley</b>: bass, the only one who can actually play</li></ul></div>`,
    `<div class="frame"><h2 style="color:#ff0">Songs</h2><ol><li>Turn It Up</li><li>Turn It Up (Louder)</li><li>My Mom Says Turn It Down</li><li>Ballad of the Broken Amp</li></ol><p>Somebody asked us to put an MP3 on here. We looked it up. A 4-minute song is about 4 MB. At 28.8K that's about 20 minutes to download. Come to a show instead.</p></div>`,
    `<div class="frame"><h2 style="color:#ff0">Upcoming Shows</h2><p>Saturday: Big Tony's garage, 2 PM (unless his dad needs the car)</p></div>`,
    bandRing(h, U.static) + stopBtn('TURN IT DOWN')
  ], after(root, nv) { bindStop(root, h); bindRing(root, nv, U.static); } }), [{ title: 'Static Cling: the loudest band in Texas', desc: "DoomDude's garage band. Songs, shows and yelling.", keywords: 'band music garage rock loud static cling doomdude texas guitar drums', cat: 'music' }]);
  const POLKA = { mel: [67, 72, 76, 72, 67, 72, 76, 79, 77, 74, 71, 74, 77, 74, 71, 67], bass: [48, 43, 50, 43], step: 0.13, lead: 'square', leadVol: 0.03, drums: 'four' };
  reg(U.floppy, h => ({ title: 'The Floppy Disks', cls: 'w95', music: POLKA, blocks: [
    `<div class="hdr" style="background:#036">The Floppy Disks<small>Polka. Punk. Polka-punk. Accordion and keytar since 1993.</small></div>`,
    `<p><b>Who we are:</b> Three friends from computer club who wanted to start a band but only owned an accordion and a keytar. It went better than you'd think.</p><h2>Greatest Hits</h2><ul><li>"Insert Disk 2 of 14"</li><li>"The Write-Protect Tab Polka"</li><li>"General Protection Fault (In My Heart)"</li><li>"Defrag Me Baby"</li></ul>`,
    `<p><b>Band fact:</b> A 3.5-inch floppy disk holds 1.44 MB. Our whole album fits on 31 of them. We sell it as a set. Nobody has bought it.</p>`,
    bandRing(h, U.floppy) + stopBtn('Stop the polka')
  ], after(root, nv) { bindStop(root, h); bindRing(root, nv, U.floppy); } }), [{ title: 'The Floppy Disks: polka-punk band', desc: 'A band with one accordion, one keytar, and songs about computers.', keywords: 'band music polka punk accordion keytar floppy disks garage', cat: 'music' }]);
  reg(U.minivan, h => ({ title: "Mom's Minivan", cls: 'w95', blocks: [
    `<h1 style="font-family:Arial;color:#669">Mom's Minivan</h1><p><i>We are a band. We practice in my mom's minivan. She drives. It's fine.</i></p>`,
    `<h2>FAQ</h2><dl><dt><b>Why the minivan?</b></dt><dd>The garage is full of Dad's exercise bike that nobody uses.</dd><dt><b>What kind of music?</b></dt><dd>Car-pool rock. Every song is exactly as long as the drive to school (11 minutes).</dd><dt><b>Do you have a record deal?</b></dt><dd>We have a deal with my mom: we can practice if we carry in the groceries.</dd></dl>`,
    `<p>Our friend Kevin from ${A(h, U.kevin, 'The Dial Tones')} said we're "pretty good for a band that has to wear seatbelts."</p>`,
    bandRing(h, U.minivan)
  ], after(root, nv) { bindRing(root, nv, U.minivan); } }), [{ title: "Mom's Minivan (a band)", desc: 'A band that practices in a minivan. Car-pool rock.', keywords: 'band music minivan car garage rock', cat: 'music' }]);

  /* ---------- the Web Ring hub ---------- */
  reg(U.ring, h => ({ title: 'RingMaster: Home of the Web Rings', cls: 'w95', blocks: [
    `<div class="hdr" style="background:#600">RingMaster<small>Home of 3,000 web rings. Surf from site to site without searching!</small></div>`,
    `<p><b>What's a web ring?</b> A web ring is a circle of home pages about the same thing. At the bottom of each page are <b>Prev</b> and <b>Next</b> links. Keep clicking Next and you'll visit every page in the ring, and end up right back where you started!</p>`,
    `<h2>Popular Rings</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Ring</th><th>Sites</th><th>Start surfing</th></tr>
      <tr><td><b>Garage Band Web Ring</b><br><small>Bands that practice in garages (and one minivan)</small></td><td>4</td><td>${A(h, U.static, 'Start')} | <a href="#" data-rand="band">Random</a></td></tr>
      <tr><td><b>Hamster &amp; Gerbil Web Ring</b><br><small>Small, fuzzy, and up all night</small></td><td>3</td><td>${A(h, U.hamster, 'Start')} | <a href="#" data-rand="pet">Random</a></td></tr>
      <tr><td><b>Unexplained Web Ring</b><br><small>Mysteries, UFOs and missing toast</small></td><td>1 (so far)</td><td>${A(h, U.dana, 'Start')}</td></tr>
      <tr><td><b>Web Rings About Web Rings Ring</b></td><td>0</td><td><small>Under construction</small></td></tr></table>`,
    `<p>Start your own ring! Email us your page address. (Your page must have Prev and Next links, and at least one animated GIF.)</p><p>${A(h, U.cyber, 'CyberBurbs member directory')} | ${A(h, U.home, 'PrairieNet')}</p>`
  ], after(root, nv) {
    root.querySelectorAll('[data-rand]').forEach(a => a.onclick = e => { e.preventDefault(); e.stopPropagation(); const l = a.dataset.rand === 'band' ? BANDS : [U.hamster, U.gerbils, U.pound]; nv.nav(l[Math.random() * l.length | 0]); });
  } }), [{ title: 'RingMaster: Web Ring Hub', desc: 'What is a web ring? Surf the Garage Band, Hamster and Unexplained rings.', keywords: 'web ring webring rings surf random next prev hub', cat: 'fun' }]);

  /* ---------- the world's biggest guestbook ---------- */
  const BIG_GB = [
    { n: 'Anonymous', w: 'The Internet', m: 'first!!!' },
    { n: 'Kevin', w: 'Silicon Hills', m: "This guestbook is bigger than mine. I'm not jealous. Sign mine too." },
    { n: 'Dana', w: 'Ohio', m: 'Big Ed, what is this page ABOUT?' },
    { n: 'Big Ed', w: 'Heartland', m: 'Dana: it is about the guestbook.' },
    { n: 'DoomDude', w: 'Texas', m: 'SIGNING THIS VERY LOUDLY' },
    { n: 'Grandma Jo', w: 'Kansas', m: 'Hello Ed. I think I signed this already. I cannot find the back button.' },
    { n: 'Earl', w: 'Prairie City', m: 'Partly cloudy here. Nice guestbook.' },
    { n: 'Tyler', w: 'Petsburgh', m: 'Nibbles says hi. (He walked on the keyboard: jjjjjjjjjj)' },
    { n: 'Webmaster Steve', w: 'Somewhere on the Net', m: 'Your background makes my eyes hurt. Still love it.' },
    { n: 'Bina', w: 'Prairie State University', m: 'Adding this to my Cool Links list. It is now a very long list.' },
    { n: 'Sally', w: "Sysop Sally's BBS", m: 'The Web is fun but I miss when only one person could call at a time.' },
    { n: 'Anonymous', w: 'The Internet', m: 'second!!!' }
  ];
  reg(U.guest, h => {
    const g = gbook(h, 'bigGuestbook', BIG_GB);
    const n = 1204 + g.count();
    return { title: "The World's Biggest Guestbook", cls: 'w95', blocks: [
      `<h1 style="font-family:Arial;text-align:center;color:#036">The World's Biggest Guestbook<br><small style="font-size:14px">(probably)</small></h1><p style="text-align:center">This page has one purpose: the guestbook. That's it. That's the page.</p><p style="text-align:center"><b>Signatures so far: ${n.toLocaleString()}</b> &nbsp; Goal: 1,000,000 &nbsp; <span style="display:inline-block;width:160px;height:12px;border:2px inset #999;vertical-align:middle;background:#fff"><span style="display:block;height:100%;width:${Math.max(1, n / 10000).toFixed(1)}%;background:#00c"></span></span></p>`,
      `<h2 style="font-family:Arial">Sign It! Please! It's the whole point!</h2>${h.gb.form()}`,
      `<h2 style="font-family:Arial">Latest Signatures</h2><div>${h.gb.html(h.store.get('bigGuestbook', BIG_GB).slice().reverse())}</div>`,
      `<p><small>Older signatures are stored on floppy disks in Big Ed's basement.</small></p><p>${A(h, U.cyber, 'CyberBurbs Heartland')} | ${A(h, U.home, 'PrairieNet')}</p>`
    ], after(root, nv) { g.bind(root, nv, U.guest); } };
  }, [{ title: "The World's Biggest Guestbook", desc: 'A page that is only a guestbook. Sign it! It is the whole point!', keywords: 'guestbook sign guest book biggest record messages', cat: 'fun' }]);

  /* ---------- hit counter vendor ---------- */
  const CSTY = [['odo', 'Classic Odometer', 'background:linear-gradient(#fff,#bbb 45%,#888 50%,#ddd);color:#000'], ['led', 'Green LED', 'background:#010;color:#0f0;text-shadow:0 0 4px #0f0'], ['flame', 'Flaming Digits', 'background:#300;color:#fd0;text-shadow:0 -2px 3px #f40'], ['pastel', 'Pastel Party', 'background:#fcf;color:#90c'], ['nixie', 'Space Age', 'background:#111;color:#f93;text-shadow:0 0 6px #f60']];
  const digits = (n, st) => `<span style="display:inline-flex;gap:2px;padding:3px;background:#222;border:2px inset #888">${String(n).padStart(7, '0').split('').map(d => `<i style="font:700 22px 'Courier New',monospace;font-style:normal;padding:0 4px;${st}">${d}</i>`).join('')}</span>`;
  reg(U.counter, h => ({ title: 'CounterMania: FREE Hit Counters!', cls: 'w95', blocks: [
    `<div class="hdr" style="background:#303">CounterMania<small>FREE hit counters for your home page! Over 40,000 counters served!</small></div>`,
    `<p>Every great home page has a hit counter. Show the world how popular you are!</p><table cellpadding="6">${CSTY.map((s, i) => `<tr><td><label><input type="radio" name="cst" value="${i}"${i ? '' : ' checked'}> <b>${s[1]}</b></label></td><td>${digits(4217 + i * 1111, s[2])}</td></tr>`).join('')}</table>`,
    `<p><label>Start my counter at: <input type="text" data-start value="48210" size="8" maxlength="7" aria-label="Starting number"></label> <button class="btn" data-make>Make my counter!</button></p><div data-out></div>`,
    `<h2 style="font-family:Arial">Frequently Asked Questions</h2><p><b>Q: Can I start my counter at any number?</b><br>A: Yes! Why start at 1 when you could start at 48,210? Nobody will ever know.</p><p><b>Q: Does it count when I reload my own page?</b><br>A: Yes. Everybody does it. Reload away.</p><p><b>Q: Is it really free?</b><br>A: Yes! There's just a tiny ad for CounterMania underneath. And a pop-up. Just kidding. (For now.)</p>`,
    `<p>${A(h, U.cyber, 'Get a free home page at CyberBurbs')} | ${A(h, U.home, 'PrairieNet')}</p>`
  ], after(root) {
    root.querySelector('[data-make]').onclick = () => {
      const i = +((root.querySelector('input[name=cst]:checked') || {}).value || 0);
      const n = Math.min(9999999, Math.max(0, parseInt(root.querySelector('[data-start]').value.replace(/\D/g, ''), 10) || 0));
      root.querySelector('[data-out]').innerHTML = `<p>Here's your counter:</p><p>${digits(n, CSTY[i][2])}</p><p>Copy this into your page:</p><pre style="background:#fff;border:1px solid #999;padding:6px;white-space:pre-wrap">${h.esc(`<IMG SRC="http://www.countermania.com/cgi-bin/count.cgi?start=${n}&style=${CSTY[i][0]}">`)}</pre><p><small>Or build your page in ${h.APP('pagebuilder', 'Home Page Builder')}, which has a counter built in.</small></p>`;
    };
  } }), [{ title: 'CounterMania: FREE Hit Counters', desc: 'Get a free hit counter for your home page. Start it at any number!', keywords: 'hit counter counters visitors free home page odometer popular', cat: 'computers' }]);

  /* ---------- an early online store (the cart goes nowhere) ---------- */
  const GOODS = [['Mousepad with a picture of a mouse on it', 7.95], ['Glow-in-the-dark keyboard stickers', 3.50], ['The Big Book of Web Addresses (1995 edition, 12 pages)', 19.95], ['Hand-knit modem cozy', 12.00], ['1,000 Clip Art Pictures on CD-ROM', 24.95], ['"I Survived the Information Superhighway" T-shirt', 14.95]];
  reg(U.shop, h => {
    const cart = h.store.get('shopCart', []);
    const total = cart.reduce((s, i) => s + (GOODS[i] ? GOODS[i][1] : 0), 0);
    return { title: 'ShopTron: The Mall of the Future', cls: 'w95', blocks: [
      `<div class="hdr" style="background:#060">ShopTron<small>The mall of the future! Shop from your chair! No parking lot!</small></div>`,
      `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Item</th><th>Price</th><th></th></tr>${GOODS.map((g, i) => `<tr><td>${g[0]}</td><td>$${g[1].toFixed(2)}</td><td><button class="btn" data-buy="${i}">Add to cart</button></td></tr>`).join('')}</table>`,
      `<div style="border:2px solid #060;background:#efe;padding:6px 10px;margin:10px 0"><b>Your Shopping Cart</b> (${cart.length} item${cart.length === 1 ? '' : 's'})<br>${cart.length ? cart.map(i => h.esc(GOODS[i] ? GOODS[i][0] : '')).join('<br>') + `<br><b>Total: $${total.toFixed(2)}</b> <button class="btn" data-empty>Empty cart</button> <button class="btn" data-checkout><b>Check out</b></button>` : 'Your cart is empty.'}</div><div data-co></div>`,
      `<p><small>ShopTron never asks for your credit card on the Web. It isn't safe yet! (And neither is our server, which is in a closet.)</small></p><p>${A(h, U.news, 'The Daily Byte')} | ${A(h, U.home, 'PrairieNet')}</p>`
    ], after(root, nv) {
      root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const c = h.store.get('shopCart', []); c.push(+b.dataset.buy); h.store.set('shopCart', c.slice(-20)); nv.nav(U.shop, 'reload'); });
      const em = root.querySelector('[data-empty]'); if (em) em.onclick = () => { h.store.set('shopCart', []); nv.nav(U.shop, 'reload'); };
      const co = root.querySelector('[data-checkout]');
      if (co) co.onclick = () => {
        root.querySelector('[data-co]').innerHTML = `<div style="border:3px double #000;background:#fff;padding:10px"><h2 style="font-family:Arial;margin-top:0">Thank you for shopping at ShopTron!</h2><p>To finish your order:</p><ol><li>Print this page.</li><li>Put it in an envelope with a check for <b>$${total.toFixed(2)}</b> plus $4.95 shipping.</li><li>Mail it to ShopTron, P.O. Box 95, Prairie City.</li><li>Wait 6 to 8 weeks.</li></ol><p><i>Secure online payment is coming in 1996. Probably.</i></p></div>`;
        h.msgBox('ShopTron', 'Your order is almost complete! Now print the page and mail it to us with a check.\n\nIn 1995, lots of "online" stores really worked like this.', ['OK']);
      };
    }};
  }, [{ title: 'ShopTron: The Mall of the Future', desc: 'Shop online! Put things in a shopping cart, then mail us a check.', keywords: 'shop shopping store buy cart mall online order mousepad t-shirt', cat: 'computers' }]);

  /* ---------- online encyclopedia (volume A to C only) ---------- */
  const ARTICLES = [
    ['aardvark', 'Aardvark', 'An aardvark is a mammal that lives in Africa, south of the Sahara Desert. It uses its strong claws to dig into ant and termite nests, then slurps up the insects with its long, sticky tongue. Its name comes from the Afrikaans language and means "earth pig," but it is not a pig at all. Aardvarks sleep in burrows during the day and come out at night.'],
    ['antarctica', 'Antarctica', 'Antarctica is the continent around the South Pole. It is the coldest, windiest and driest continent on Earth, and about 98 percent of it is covered by a thick sheet of ice. No people live there all year long for good, but scientists from many countries stay at research stations. Penguins and seals live along its coasts.'],
    ['bat', 'Bat', 'Bats are the only mammals that can truly fly. Their wings are made of thin skin stretched between very long finger bones. Many bats find their way in the dark using echolocation: they make high-pitched sounds and listen for the echoes. Some bats eat insects, and others eat fruit or drink nectar from flowers, which helps plants spread their pollen and seeds.'],
    ['bee', 'Bee (Honeybee)', 'Honeybees live together in big groups called colonies. Worker bees collect nectar and pollen from flowers and turn the nectar into honey. A bee that finds good flowers can do a "waggle dance" that tells the other bees which direction to fly and how far to go. Bees help plants make fruit and seeds by carrying pollen from flower to flower.'],
    ['bluewhale', 'Blue Whale', 'The blue whale is the largest animal known to have ever lived, bigger than any dinosaur. It can grow to about 30 meters (almost 100 feet) long. Even so, it eats some of the smallest animals in the sea: tiny shrimp-like creatures called krill. Blue whales are mammals, so they breathe air through blowholes on top of their heads.'],
    ['camel', 'Camel', 'Camels live in dry deserts. A dromedary camel has one hump and a Bactrian camel has two. The humps store fat, not water. Camels can go a long time without drinking, and they have long eyelashes and nostrils they can close to keep out blowing sand.'],
    ['chameleon', 'Chameleon', 'Chameleons are lizards famous for changing color. They change color to send signals to other chameleons and to warm up or cool down, not only to hide. Each of their eyes can move on its own, so a chameleon can look in two directions at once. It catches insects with a long, fast, sticky tongue.'],
    ['cheetah', 'Cheetah', 'The cheetah is the fastest land animal. It can run about 100 to 110 kilometers (60 to 70 miles) per hour, but only in short bursts. Most cheetahs live in Africa, and they hunt during the day. The black "tear marks" under their eyes may help cut down the glare from the sun.'],
    ['cloud', 'Cloud', 'A cloud is made of billions of tiny water droplets or ice crystals floating in the air. Clouds form when warm, damp air rises and cools. Puffy, fluffy clouds are called cumulus clouds. Thin, wispy clouds high in the sky are called cirrus clouds. Rain falls when the droplets bump together and grow too heavy to float.'],
    ['comet', 'Comet', 'A comet is a chunk of ice, dust and rock that travels around the Sun. When a comet gets close to the Sun, some of its ice turns into gas, making a glowing cloud and a long tail. The tail always points away from the Sun. Halley\'s Comet comes back about every 76 years. It was last seen in 1986 and will return in 2061.'],
    ['computer', 'Computer', 'A computer is a machine that follows instructions, called a program, to work with information. Some of the first electronic computers, built in the 1940s, filled whole rooms. Today a home computer fits on a desk, and it can talk to other computers around the world using a modem and a telephone line.']
  ];
  const PEDIA_HDR = h => `<div class="hdr" style="background:#024">InfoSphere Online Encyclopedia<small>Volume 1: A to C. Volumes D to Z are coming on CD-ROM next year!</small></div>`;
  reg(U.pedia, h => ({ title: 'InfoSphere Online Encyclopedia', cls: 'w95', blocks: [
    PEDIA_HDR(h),
    `<form data-ps><label>Look up a word: <input type="text" name="q" size="24" aria-label="Look up a word"></label> <button class="btn" type="submit">Look it up</button></form><div data-pr></div>`,
    `<h2 style="font-family:Arial">All Articles</h2><ul>${ARTICLES.map(a => `<li>${A(h, U.pedia + 'article/' + a[0] + '.html', a[1])}</li>`).join('')}</ul>`,
    `<p><small>All articles checked by our team of experts (two librarians and a very smart 5th grader).</small></p><p>${A(h, U.kids, 'Kids Only')} | ${A(h, U.home, 'PrairieNet')}</p>`
  ], after(root) {
    const f = root.querySelector('[data-ps]'), out = root.querySelector('[data-pr]');
    f.onsubmit = e => {
      e.preventDefault();
      const q = f.q.value.trim().toLowerCase(); if (!q) return;
      const hit = ARTICLES.filter(a => (a[1] + ' ' + a[2]).toLowerCase().includes(q));
      out.innerHTML = /^[d-z]/.test(q) && !hit.length ? `<p>Sorry, "<b>${h.esc(q)}</b>" is in a volume we haven't finished yet. Words starting with D to Z will be on our CD-ROM next year!</p>` : hit.length ? `<p>Found ${hit.length}:</p><ul>${hit.map(a => `<li>${h.A(U.pedia + 'article/' + a[0] + '.html', a[1])}</li>`).join('')}</ul>` : `<p>No articles found for "<b>${h.esc(q)}</b>".</p>`;
    };
  } }), [{ title: 'InfoSphere Online Encyclopedia (A to C)', desc: 'Kid-friendly articles: aardvark, Antarctica, bats, bees, blue whale, camel, chameleon, cheetah, clouds, comets, computers.', keywords: 'encyclopedia facts learn school homework animals aardvark antarctica bat bee whale camel chameleon cheetah cloud comet computer science', cat: 'edu' }]);
  SITES.push({ eras: Y, match: url => url.startsWith(U.pedia + 'article/'), page: (url, h) => {
    const a = ARTICLES.find(x => url === U.pedia + 'article/' + x[0] + '.html');
    if (!a) return { title: 'Article Not Found', cls: 'w95', blocks: [PEDIA_HDR(h), `<p>We haven't written that article yet.</p><p>${h.A(U.pedia, 'Back to the encyclopedia')}</p>`] };
    const i = ARTICLES.indexOf(a), prev = ARTICLES[i - 1], next = ARTICLES[i + 1];
    return { title: 'InfoSphere: ' + a[1], cls: 'w95', blocks: [PEDIA_HDR(h), `<h1 style="font-family:Georgia,serif">${a[1]}</h1><p style="font-size:17px;line-height:1.5;max-width:36em">${a[2]}</p>`, `<p>${prev ? h.A(U.pedia + 'article/' + prev[0] + '.html', '&lt;&lt; ' + prev[1]) + ' | ' : ''}${h.A(U.pedia, 'All articles')}${next ? ' | ' + h.A(U.pedia + 'article/' + next[0] + '.html', next[1] + ' &gt;&gt;') : ''}</p>`] };
  } });

  /* ---------- movie times ---------- */
  const FILMS = [
    ['Robo-Beagle 2: Unleashed', 'PG', "He's part dog, part robot, all good boy. This time, he fetches the future.", ['1:00', '3:30', '7:00', '9:15']],
    ['The Toaster Who Knew Too Much', 'PG', 'A small kitchen appliance overhears a big secret. Nobody believes a toaster.', ['2:15', '4:45', '7:30']],
    ['Love at 28.8', 'PG', 'Two strangers meet in a chat room. Then her little brother picks up the phone.', ['4:00', '6:45', '9:30']],
    ['Dinosaur Dentist', 'G', 'An animated adventure about a brave dentist with a very big patient.', ['11:00', '1:15', '3:15', '5:15']],
    ['Space Camp Counselors', 'PG', 'The campers are aliens. The counselors are not ready.', ['12:30', '5:00', '8:00']]
  ];
  reg(U.movies, h => ({ title: 'Prairie 6 Cinemas: Showtimes', cls: 'w95', blocks: [
    `<div class="hdr" style="background:#400">Prairie 6 Cinemas<small>Now showing! Showtimes for this Friday. Stadium seating coming soon.</small></div>`,
    FILMS.map(f => `<div style="border-bottom:1px solid #999;padding:6px 0"><b style="font:700 17px Arial">${f[0]}</b> <small>(Rated ${f[1]})</small><br><i>${f[2]}</i><br>${f[3].map(t => `<span style="display:inline-block;border:1px solid #400;padding:1px 6px;margin:3px 3px 0 0;font:12px Arial">${t}</span>`).join('')}</div>`).join(''),
    `<p><b>Coming Summer 1996:</b> <i>The Unexplained Files: The Movie</i>. (Dana, we know. Please stop emailing us.)</p><p><b>Buy tickets:</b> Online tickets are coming soon! For now, call 555-0166 and a real teenager will answer.</p><p>${A(h, U.kids, 'Kids Only')} | ${A(h, U.home, 'PrairieNet')}</p>`
  ]}), [{ title: 'Prairie 6 Cinemas: Movie Showtimes', desc: "What's playing this Friday: Robo-Beagle 2, Dinosaur Dentist and more.", keywords: 'movies movie showtimes cinema theater film tickets robo beagle dinosaur', cat: 'tv' }]);

  /* ---------- WebFinder categories (the 1995 WebFinder page links to some of these) ---------- */
  const CATS = { arts: ['Arts &amp; Humanities', 2210, ['music', 'tv']], edu: ['Education', 6930, ['edu']], sports: ['Sports', 3815, []], tv: ['Television', 5020, ['tv']] };
  SITES.push({ eras: Y, match: url => /^http:\/\/www\.webfinder\.com\/(arts|edu|sports|tv)\/$/.test(url), page: (url, h) => {
    const [name, n, cats] = CATS[url.split('/')[3]];
    const list = ENTRIES.filter(e => cats.includes(e.cat));
    return { title: 'WebFinder: ' + name.replace('&amp;', '&'), cls: 'w95 dir', blocks: [
      `<h1 style="color:#800000;font:italic 700 30px Georgia,serif">WebFinder</h1><h2>${name} (${n.toLocaleString()})</h2>`,
      list.length ? `<ul>${list.map(e => `<li>${h.A(e.url, h.esc(e.title))}<br><small>${h.esc(e.desc)}</small></li>`).join('')}</ul><p><small>Showing ${list.length} of ${n.toLocaleString()}. The rest are still being sorted by hand.</small></p>` : `<p>Our ${name.toLowerCase()} editor is out sick. Try searching instead!</p>`,
      `<p>${h.A(U.finder, 'Back to WebFinder')}</p>`
    ]};
  } });
})();
