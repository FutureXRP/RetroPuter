/* Buddy Brain: a free, fully offline, rule-based chat buddy engine for RetroPuter.
   ELIZA-style pattern matching + persistent memory + light learning + kid-safety checks.
   No network, no libraries. Exposes exactly one global: window.BuddyBrain.
   NOTE: the blocked-word list is NOT bundled here. Load it at startup with
   BuddyBrain.addWords(words, { roots, phrases }) (see the report / integration notes). */
(function (G) {
'use strict';

/* ---------- helpers ---------- */
const rnd = Math.random;
const pick = a => (a && a.length ? a[Math.floor(rnd() * a.length)] : '');
const chance = p => rnd() < p;
const str = (s, n) => { s = s == null ? '' : typeof s === 'string' ? s : String(s); return n && s.length > n ? s.slice(0, n) : s; };
const now = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const stripTags = s => String(s).replace(/<\/?[a-z!?][^>]*(>|$)/gi, ' ').replace(/<(?!3)|>/g, ' ');
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const arr = a => (Array.isArray(a) ? a : []);
const echo = (s, n) => str(s).replace(/[^a-z0-9 '\-]/gi, '').replace(/\s+/g, ' ').trim().slice(0, n || 40).trim();
const wset = s => new Set(s.split(' '));
function wpick(list) { let t = 0; list.forEach(x => { t += x[0]; }); let r = rnd() * t; for (const x of list) { if ((r -= x[0]) < 0) return x[1]; } return list.length ? list[list.length - 1][1] : null; }

/* ---------- safety: word filter engine (list supplied at runtime) ---------- */
const BAD = new Set(), ROOTS = [], PHRASES = [];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '+': 't', '|': 'i' };
function coreOf(tok, alt) {
  let t = tok.toLowerCase().replace(/^[^a-z0-9@$*]+|[^a-z0-9@$*]+$/g, '');
  if (/[a-z@$]/.test(t)) t = t.replace(/[0134578 9@$!+|]/g, c => (alt && (c === '1' || c === '|') ? 'l' : LEET[c] || c));
  return t.replace(/[^a-z*]/g, '');
}
function isBad(w) {
  if (!w || w.length < 2 || !BAD.size && !ROOTS.length) return false;
  if (BAD.has(w)) return true;
  if (w.indexOf('*') >= 0) {
    if (w.length < 3 || w.replace(/\*/g, '').length < 1) return false;
    const re = new RegExp('^' + w.replace(/\*/g, '[a-z]') + '$');
    for (const b of BAD) if (re.test(b)) return true;
    return false;
  }
  for (const r of ROOTS) if (w.indexOf(r) >= 0) return true;
  return BAD.has(w.replace(/(.)\1{2,}/g, '$1$1')) || BAD.has(w.replace(/(.)\1+/g, '$1'));
}
function addWords(words, opt) {
  const clean = w => str(w).toLowerCase().replace(/[^a-z ]/g, '').trim();
  arr(words).forEach(w => { w = clean(w); if (w.length > 1) BAD.add(w); });
  opt = opt || {};
  arr(opt.roots).forEach(w => { w = clean(w); if (w.length > 2 && ROOTS.indexOf(w) < 0) ROOTS.push(w); });
  arr(opt.phrases).forEach(p => { p = clean(p).split(/\s+/).filter(Boolean); if (p.length > 1) PHRASES.push(p); });
  return BAD.size;
}

/* self-harm / someone-hurting-me signals (checked on normalized text) */
const HARM = [
  [/\b(kill|hurt|cut|harm|stab|starve) (my ?self|myself)\b|\bkms\b|\bsuicid/, 'self'],
  [/\b(want|wanna|going|trying|ready|deserve) to die\b|\bi (want to|wish i was|wish i were|wish i could) (be )?dead\b/, 'self'],
  [/\bwish i (was|were|had) never (been )?born\b|\b(end|take) my (own )?life\b|\bno reason to live\b|\bbetter off (dead|without me)\b/, 'self'],
  [/\b(do not|dont) want to (live|be alive|exist) ?(anymore)?\b|\bnobody would (care|miss me) if i\b/, 'self'],
  [/\b(someone|somebody|he|she|they|my [a-z]+|an adult|a grown up|a grownup) (is |keeps |has been |was |kept |always )?(hurting|hitting|beating|touching|kicking|choking|abusing|hurt|hit|beat|touched|kicked|abused) me\b/, 'abuse'],
  [/\b(hits|beats|hurts|kicks|chokes|abuses) me\b|\bi am being (abused|hurt|beaten)\b|\b(scared|afraid) to go home\b|\bnot safe at home\b|\bi am not safe\b/, 'abuse'],
  [/\b(being|getting|got|am|was|get) bullied\b|\bbullies (me|are)\b|\bbullying me\b/, 'bully']
];
const CARE = {
  self: ["Hey, I'm really glad you told me. I'm just a pretend computer buddy, so I can't help the way a real person can, and you deserve real help right now.",
    "Please talk to a grown-up you trust right away, like a parent, teacher, or school counselor. In the U.S. you can call or text 988 (the Suicide & Crisis Lifeline) any time, day or night. If you are in danger right now, call 911."],
  abuse: ["I'm really sorry that's happening. It is not your fault, and you deserve to be safe.",
    "Please tell a grown-up you trust right away, like a teacher, school counselor, or another family member. In the U.S. you can call or text 988 any time to talk to someone, and if you are in danger right now, call 911."],
  bully: ["That sounds really hard, and it is not your fault. Nobody deserves to be treated that way.",
    "Please tell a grown-up you trust, like a parent, teacher, or school counselor. They can help make it stop. I'm really glad you told me."]
};

/* PII detectors (on lowercased raw text) */
const NAME_STOP = wset('a an the and but or so is are was not no yes my your his her its it this that to too very really super just also named called because like with from of in on at for lol haha ok cool and btw jk hi hey hello what whats who i im me you u by here there now today tho though too nice glad happy sad bored tired fine good great awesome ok okay yeah yep nope um uh hmm right well sure maybe if when then than as be');
const PII = [
  ['email', /[a-z0-9._%+-]+\s*@\s*[a-z0-9-]+(\s*\.\s*[a-z0-9-]+)+|\b[a-z0-9._-]+ at [a-z0-9-]+ dot (com|net|org|edu)\b/],
  ['ssn', /\b\d{3}[\s-]\d{2}[\s-]\d{4}\b|\b\d{9}\b/],
  ['card', /\b(?:\d[\s-]?){13,19}\b/],
  ['phone', /(?:\+?1[\s.-]*)?\(?\b\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}\b|\b\d{3}[\s.-]\d{4}\b|\b\d{7}\b/],
  ['address', /\b\d{1,6}\s+(?:[a-z0-9.']+\s+){1,3}(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|circle|terrace|highway|hwy|parkway|pkwy|court|ct)\b\.?|\blive (?:on|at) (?:[a-z]+ ){1,2}(?:street|avenue|road|lane|drive|boulevard|court)\b/],
  ['password', /\bmy (?:password|passcode|pin number|pin code|pass word)\b|\b(?:password|passcode|pass word)\s*(?:is|=|:|was)\s*\S/],
  ['school', /\b(?:i go to|i attend|i am at|im at|i'm at|goes to|go to|my school is(?: called)?|student at)\s+(?:the\s+)?([a-z][a-z.'-]*(?:\s+[a-z][a-z.'-]*){0,3})\s+(elementary|middle school|high school|junior high|academy|primary|school|prep|montessori)\b/],
  ['agelocation', /\b\d{1,2}\s*\/\s*[mfb][a-z]*\s*\/\s*[a-z]{2,}/]
];
const SCHOOL_GENERIC = wset('a my the public private regular grade art dance summer sunday high middle elementary music swim karate cooking driving night boarding new old big our their his her to');
function piiScan(low) {
  const kinds = [];
  PII.forEach(([k, re]) => {
    const m = low.match(re); if (!m) return;
    if (k === 'school') { const nm = m[1].split(/\s+/); if (nm.every(w => SCHOOL_GENERIC.has(w))) return; }
    if (k === 'card' && kinds.indexOf('phone') >= 0) return;
    if (kinds.indexOf(k) < 0) kinds.push(k);
  });
  if (kinds.indexOf('ssn') >= 0 && kinds.indexOf('phone') >= 0 && /\b\d{3}[\s-]\d{2}[\s-]\d{4}\b/.test(low)) kinds.splice(kinds.indexOf('phone'), 1);
  const fn = low.replace(/'/g, '').match(/\bmy (?:full |real )?name(?: is|s)\s+([a-z]{2,15})\s+([a-z]{2,20})\b/);
  if (fn && !NAME_STOP.has(fn[1]) && !NAME_STOP.has(fn[2])) kinds.push('fullname');
  if (/\bmy (last|family|sur) ?name\b/.test(low)) kinds.push('fullname');
  const age = /\b(?:i am|i'm|im|iam)\s+(\d{1,2})\b(?!\s*(?:am|pm|st|nd|rd|th|minutes|min|grade))/.test(low) || /\b\d{1,2} (?:years old|yrs old|yo)\b/.test(low);
  if (age && /\b(?:i live in|i live at|i'm from|im from|i am from|live in)\s+[a-z]/.test(low) && kinds.indexOf('agelocation') < 0) kinds.push('agelocation');
  return kinds;
}

/* one scan used both for incoming text and for anything the bot would say or learn */
function scan(raw) {
  const text = str(raw, 2000), T = [], re = /\S+/g; let m;
  while ((m = re.exec(text))) T.push({ s: m[0], i: m.index, c: coreOf(m[0]), c2: coreOf(m[0], 1) });
  let flagged = false;
  T.forEach(t => {
    const parts = t.s.toLowerCase().split(/[^a-z0-9@$*!]+/).filter(Boolean);
    if (isBad(t.c) || (t.c2 !== t.c && isBad(t.c2)) || (parts.length > 1 && parts.some(p => isBad(coreOf(p))))) t.bad = flagged = true;
  });
  for (let k = 0; k < T.length;) { // spaced-out letters: "b a d"
    if (T[k].c.length === 1) {
      let j = k; while (j < T.length && T[j].c.length === 1 && j - k < 30) j++;
      if (j - k >= 3) for (let a = k; a < j; a++) for (let b = a + 3; b <= j; b++) {
        if (isBad(T.slice(a, b).map(t => t.c).join(''))) { for (let q = a; q < b; q++) T[q].bad = true; flagged = true; }
      }
      k = j;
    } else k++;
  }
  if (PHRASES.length) {
    const EW = []; T.forEach((t, k) => (SLANG[t.c] || t.c).split(' ').forEach(w => w && EW.push({ w, k })));
    PHRASES.forEach(p => { for (let i = 0; i + p.length <= EW.length; i++) if (p.every((w, j) => EW[i + j].w === w)) { flagged = true; for (let j = 0; j < p.length; j++) T[EW[i + j].k].bad = true; } });
  }
  let clean = '', pos = 0;
  T.forEach(t => { if (t.bad) { clean += text.slice(pos, t.i) + '*'.repeat(t.s.length); pos = t.i + t.s.length; } });
  clean += text.slice(pos);
  const low = text.toLowerCase().replace(/[‘’`]/g, "'");
  const kinds = piiScan(low);
  if (kinds.length) clean = clean.replace(/\d/g, '#').replace(/[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+/gi, '***@***');
  const n = parse(text).n; let harm = '';
  for (const [r, k] of HARM) if (r.test(n)) { harm = k; break; }
  return { clean, flagged, pii: kinds.length > 0, kinds, harm };
}
function filter(text) {
  try { const r = scan(str(text, 2000)); return { clean: r.clean, flagged: r.flagged, pii: r.pii, kinds: r.kinds, harm: !!r.harm }; }
  catch (e) { return { clean: '', flagged: true, pii: false, kinds: [], harm: false }; }
}

/* ---------- normalization / chat slang ---------- */
const SLANG = {};
('u:you|yu:you|r:are|ur:your|urs:yours|urself:yourself|ure:you are|youre:you are|im:i am|iam:i am|ive:i have|dont:do not|doesnt:does not|didnt:did not|cant:can not|cannot:can not|wont:will not|isnt:is not|arent:are not|wasnt:was not|havent:have not|whats:what is|wats:what is|wat:what|wut:what|wuts:what is|hows:how is|whos:who is|wheres:where is|thats:that is|theres:there is|hes:he is|shes:she is|its:it is|wanna:want to|gonna:going to|gotta:got to|kinda:kind of|sorta:sort of|dunno:do not know|idk:i do not know|idc:i do not care|pls:please|plz:please|thx:thanks|ty:thanks|tysm:thanks|k:ok|kk:ok|okay:ok|okey:ok|y:why|b4:before|2day:today|2nite:tonight|tonite:tonight|2morrow:tomorrow|tmrw:tomorrow|luv:love|cuz:because|coz:because|bc:because|becuz:because|becuase:because|gr8:great|l8r:later|rly:really|realy:really|sry:sorry|nm:not much|hbu:how about you|wbu:what about you|wyd:what are you doing|hru:how are you|ppl:people|pic:picture|pics:pictures|fav:favorite|fave:favorite|favourite:favorite|favorit:favorite|favrite:favorite|colour:color|teh:the|freind:friend|frend:friend|waht:what|hte:the|adn:and|yuo:you|thier:their|alot:a lot|skool:school|wen:when|hav:have|gud:good|nite:night|dat:that|da:the|dis:this|bday:birthday|bro:brother|sis:sister|n:and|yea:yeah|ye:yeah|yah:yeah|ya:yeah|yup:yes|yep:yes|wassup:what is up|sup:what is up|gtg:got to go|g2g:got to go|ttyl:talk to you later|cya:see you|bbl:be back later')
  .split('|').forEach(p => { const i = p.indexOf(':'); SLANG[p.slice(0, i)] = p.slice(i + 1); });
const VOCAB = wset('about after again also animal another baby back ball balloon banana bath bear bed bedroom bike bird birthday blanket board boat book books bottle box brother bubble bucket buddy bunny cake camera candy card cards castle cereal chair cheese chicken class coach coat computer cookie costume cousin crayon crayons dad daddy dance dinner dinosaur doctor doll dollhouse dragon dream dress drawing drums family farm fish floppy flower food friend friends frog garden ghost gloves grandma grandpa guitar hamster heart helmet homework horse house jacket keyboard kitchen kitten knight lesson lessons library lunch lunchbox magic markers medal mitten mommy money monster mouse movie music ninja paper party pencil picture pillow pirate pizza planet plant player present princess puppy puzzle rabbit robot rocket room sandwich school scooter shirt shoes sister skateboard sled slime snack snowman soccer song space spider sticker stickers story superhero sweater swing table teacher teddy tent toys trampoline treehouse trophy truck turtle unicorn video wagon water weekend wizard yard zombie other things thing stuff')
const PET_KINDS = 'guinea pig|goldfish|tamagotchi|pixelpet|parakeet|hedgehog|tortoise|hamster|chicken|kitten|rabbit|parrot|turtle|lizard|ferret|iguana|gerbil|budgie|puppy|kitty|bunny|snake|horse|mouse|gecko|bird|fish|pony|frog|duck|goat|dog|cat|rat|pig|cow';
const ANACH = { tamagotchi: 1997, pokemon: 1998, furby: 1998, dvd: 1997, mp3: 1998, napster: 1999, google: 1999, spongebob: 1999, 'harry potter': 1998, ipod: 2001, xbox: 2001, wikipedia: 2001, wifi: 2003, facebook: 2004, podcast: 2004, youtube: 2005, roblox: 2006, wii: 2006, youtuber: 2006, iphone: 2007, smartphone: 2007, netflix: 2007, ipad: 2010, tablet: 2010, instagram: 2010, emoji: 2010, minecraft: 2011, siri: 2011, snapchat: 2011, selfie: 2012, alexa: 2014, discord: 2015, fortnite: 2017, squishmallow: 2017, 'fidget spinner': 2017, tiktok: 2018, 'among us': 2018 };

function collapse(w) {
  if (!/([a-z])\1{2,}/.test(w)) return w;
  const two = w.replace(/([a-z])\1{2,}/g, '$1$1'), one = w.replace(/([a-z])\1{2,}/g, '$1');
  return VOCAB.has(two) || SLANG[two] ? two : one;
}
function parse(raw) {
  const clean = stripTags(str(raw, 600));
  const low = clean.toLowerCase().replace(/[‘’`´]/g, "'");
  const s = low.replace(/\ba\s*\/\s*s\s*\/\s*l\b/g, ' asl ').replace(/'/g, '');
  const w0 = s.split(/[^a-z0-9]+/).filter(Boolean).map(collapse), w = [];
  w0.forEach(t => (SLANG[t] || t).split(' ').forEach(x => w.push(x)));
  const n = w.join(' ');
  const q = /\?/.test(clean) || /^(what|who|where|when|why|how|do|does|did|are|is|can|could|will|would|have|has|should|which)\b/.test(n);
  return { raw: clean, low, n, w, w0, q, len: w.length };
}
const swapP = s => s.split(' ').map((w, i, a) => ({ i: 'you', me: 'you', my: 'your', mine: 'yours', myself: 'yourself', our: 'your', we: 'you', us: 'you', am: 'are' })[w] || (w === 'was' && a[i - 1] === 'i' ? 'were' : w)).join(' ');
const YES = /^(yes|yeah|yes please|sure|ok|of course|definitely|totally|absolutely|i do|i did|i am|i have|yay|mhm|uh huh|why not|lets do it|lets go|alright|sounds good|k|yas)\b/;
const NO = /^(no|nope|nah|not really|never|no thanks|i do not|i did not|i am not|i have not|not now|maybe later|no way|nothing|none)\b/;
const IDK = /^(i do not know|not sure|i am not sure|no idea|hmm|um|i do not care|whatever|nevermind|never mind|nvm|i forget|i forgot)\b/;

/* ---------- topics ---------- */
const TOPICS = {
  music: 'music song songs band bands cd cds radio guitar sing singing piano drums concert mp3 mp3s jukebox album',
  games: 'game games gaming video nintendo playstation level levels worm mines arcade minecraft roblox fortnite shareware',
  school: 'school homework teacher class grade math reading spelling recess test',
  pets: 'pet pets dog dogs puppy cat cats kitten fish hamster bunny rabbit bird turtle horse pony pixelpet pixelpets',
  animals: 'animal animals zoo dinosaur dinosaurs shark sharks dolphin dolphins elephant lion tiger',
  sports: 'sport sports soccer baseball basketball football hockey swimming gymnastics tennis karate dance foosball',
  food: 'food pizza cookie cookies candy cream snack dinner lunch breakfast cake chocolate hungry snickerdoodles recipe casserole',
  tv: 'tv show shows cartoon cartoons movie movies watch watching files',
  computers: 'computer computers internet modem web page homepage email html dsl online keyboard mouse website',
  skate: 'skate skating skateboard sk8 kickflip ollie skatepark',
  books: 'book books read reading library story stories',
  family: 'mom dad brother sister grandma grandpa family cousin baby kids',
  business: 'company business ceo money startup stock office',
  space: 'space planet planets moon stars rocket astronaut'
};
const TOPIC_OF = {}; Object.keys(TOPICS).forEach(t => TOPICS[t].split(' ').forEach(w => { TOPIC_OF[w] = TOPIC_OF[w] || t; }));
const topicsIn = w => { const o = []; w.forEach(x => { const t = TOPIC_OF[x] || TOPIC_OF[x.replace(/(ing|s)$/, '')] || TOPIC_OF[x.replace(/(ing|ers?)$/, '')]; if (t && o.indexOf(t) < 0) o.push(t); }); return o; };
const TOPIC_Q = { music: 'heard any good songs lately?', games: 'played any good games lately?', school: 'how is school going?', pets: 'got any funny pet stories?', animals: "what's the coolest animal ever, in your opinion?", sports: 'played any sports lately?', food: 'eaten anything yummy lately?', tv: 'watched anything good lately?', computers: "what's your favorite thing to do on the computer?", skate: 'do you skate?', books: 'read any good books lately?', family: 'did you do anything fun with your family this week?', business: 'if you started a company, what would it sell?', space: 'if you could visit any planet, which one would it be?' };

/* ---------- personas ---------- */
const PERSONAS = {
  SkaterGrl95: { facts: {"band": "i'm not in a band, but my friends and i air-guitar at the mall. does that count?", "pet": "a cat named Mulder! yes, like the x-files", "school": "10th grade at the high school. my locker is the best decorated one", "family": "a little brother who picks up the phone and breaks my modem connection", "site": "no home page yet! kevin keeps saying he'll help me make one", "car": "no car, i'm 15! i have a skateboard though", "computer": "it's the family computer. it lives in the kitchen", "score": "i beat kevin at air hockey once. he doesn't talk about it", "instrument": "i played recorder in 4th grade. never again"}, era: '1995', call: 'skatergrl skatergirl skater', v: { c: 'lower', u: .5, ex: .5, emo: [':)', ':-)', ':D'], ep: .35, pre: ['omg ', 'like, ', 'totally, '], pp: .1, typo: .08, cps: 9, apos: .5 },
    bio: { age: ["i'm 15! sophomore at the high school", '15. old enough to skate, too young to drive. ugh'], where: ['ohio! small town, one mall, zero skate parks'], job: ["i'm in 10th grade. i skate, i watch way too much tv, and i sell pretzels at the mall on saturdays"], who: ["i'm skatergrl95! i skate, i love grunge and i never miss the x-files"] },
    fav: { color: 'purple', food: 'pizza bagels', animal: 'dolphins', game: 'air hockey at the mall arcade', sport: 'skateboarding, duh', song: 'anything grunge', band: 'anything grunge', show: 'the x-files', movie: 'clueless', book: 'my diary lol', subject: 'art' },
    likes: 'skate skating skateboard board grunge music tv mall pizza dolphins art', hates: 'homework math algebra', topics: 'skate music tv school',
    says: { skate: ['i almost landed a kickflip today!! almost', 'my board has stickers from every band i like', 'mall security yelled at us for skating again lol'], music: ['grunge forever', 'i taped a song off the radio but the dj talked over the start. classic', 'i wear flannel even in summer. its a commitment'], tv: ['who else watches the x-files? the truth is out there', 'i set the vcr to tape my show and it taped the news instead. ugh'], school: ['my locker is covered in magazine pictures', 'we have a pop quiz tomorrow. how is it a pop quiz if they tell us'] },
    doing: ['my mom needs the phone in 10 minutes', 'eating pizza bagels at the computer. dont tell my mom', 'painting my nails while i type. its hard', 'my little brother keeps picking up the phone and it makes the modem scream'],
    real: ["lol ok busted, i'm a computer character in RetroPuter! but my love of skating is 100% real", "i'm a pretend chat buddy who lives in RetroPuter. still totally rad tho"], laugh: ['lol', 'hahaha', 'LOL!!'] },
  DoomDude: { facts: {"band": "no band. i make music in a tracker program though. it's all beeps", "pet": "a hamster named Turbo. he runs faster than my modem", "school": "8th grade. computer lab is the best class", "family": "an older brother who hogs the computer", "site": "no home page yet. i'm saving up disk space lol", "car": "i'm 14 lol. i have a bike", "computer": "a 486 with 8 megs of ram and a 28.8 modem. it's a beast", "score": "i beat level 3. nobody else in my class has", "instrument": "does a keyboard count? the computer kind"}, era: '1995', call: 'doom doomdude', v: { c: 'mixed', u: .5, ex: .6, emo: [':)'], ep: .1, pre: ['ROFL ', 'sweet, ', 'dude '], pp: .15, typo: .1, cps: 11, apos: .5, shout: .15 },
    bio: { age: ['14. old enough to beat level 3'], where: ['illinois. its flat. good for running long phone cords'], job: ["i'm in 8th grade. mostly i play games and trade shareware on floppies"], who: ['DoomDude. gamer. level 3 champion. proud owner of a 28.8 modem'] },
    fav: { color: 'green, like my monitor', food: 'pizza rolls', game: 'anything with a secret level', sport: 'games are a sport', animal: 'dragons (they count)', song: 'video game music', show: 'saturday morning cartoons', movie: 'jurassic park', book: 'game strategy guides', subject: 'computer lab' },
    likes: 'game games level levels shareware floppy modem computer pizza cheat codes arcade', hates: 'homework busy signal', topics: 'games computers',
    says: { games: ['just beat level 3!!!', "i found a secret level. i'm not telling where (its behind the wall)", 'anyone want to trade shareware?', 'i beat mines on expert. ok, beginner. ok i lost'], computers: ['my modem is 28.8 now. SO FAST', 'my dad got a CD-ROM with an entire encyclopedia on it', 'my computer has 8 megs of ram. its a beast'] },
    doing: ['my mom says 5 more minutes then homework', 'brb my brother needs the phone', 'eating pizza rolls. burned my mouth. worth it'],
    real: ["ROFL busted. i'm a computer character in RetroPuter. but my high scores are legit"], laugh: ['ROFL', 'LOL', 'haha!!'] },
  CyberKev: { facts: {"band": "The Dial Tones! i play guitar. we're playing the school dance friday", "pet": "my dog Pixel! he's 7 now. he's been on my home page since 1990 lol", "school": "i'm a senior at Prairie High", "family": "a little sister who always needs the phone. and my grandma jo, who just got email", "site": "kevin's kool kyber korner on CyberBurbs! now with tables", "car": "i share my mom's minivan. it is not cool. i am cool IN it though", "computer": "a pentium! ok, it's my dad's. i'm borrowing it indefinitely", "score": "12,880 in worm. i will wait", "instrument": "guitar! i know 4 chords, and they're good chords"}, era: '1995', call: 'kev kevin cyberkev', same: 'KevRocks22', v: { c: 'lower', u: .8, ex: .2, emo: [':)', ';)'], ep: .12, pre: ['dude ', 'dude, ', 'man '], pp: .22, typo: .1, cps: 10, apos: 1 },
    bio: { age: ["i'm 17! senior at Prairie High, which is basically being an adult"], where: ['nebraska. PrairieNet country lol'], job: ["i'm in high school. i play guitar in The Dial Tones and i make web pages. i learned tables!!"], who: ["i'm kevin! i run kevin's kool kyber korner on CyberBurbs. sign my guestbook"] },
    fav: { color: 'black, like my web page background', food: 'tater tots', game: 'worm. i have the high score', animal: 'the FishCam fish', sport: 'does worm count', song: 'anything by The Dial Tones (my band)', band: 'The Dial Tones obviously', show: 'the x-files', movie: 'hackers', book: 'my html book', subject: 'computer lab' },
    likes: 'html web page homepage guitar band music worm game computer internet modem fishcam tater', hates: 'gym busy signal', topics: 'computers music games',
    says: { computers: ['i learned tables in html. i am unstoppable', 'my page has a counter. 43 visitors. 40 were me', 'i made my text blink. my mom says it gives her a headache', 'my old page from 1990 was so embarrassing lol'], music: ['The Dial Tones are playing the school dance friday!!', 'we practice in my garage. the neighbors have opinions', 'i only know 4 chords but they are good chords'], games: ['my worm high score is 12,880. i will wait', 'worm is the greatest game ever made. fight me (in worm)'] },
    doing: ['brb my sister needs the phone', 'my mom keeps picking up the phone and kicking me offline', 'updating my home page. adding MORE flame gifs', 'eating tater tots and coding html'],
    real: ["lol ya i'm a computer character in RetroPuter. but my worm high score is REAL", "i'm a pretend chat buddy. RetroPuter made me. i still rock tho"], laugh: ['lol', 'haha', 'lol nice'] },
  MomOf3: { facts: {"band": "Oh, no band for me! I sing in the church choir, though.", "pet": "Our dog, Pickles. He eats socks.", "school": "I finished school a long time ago! Now I help with three sets of homework.", "family": "Three kids, and a husband who also needs the phone line.", "site": "A home page? Oh my. My son says he will make me one.", "car": "A station wagon with wood paneling. It has seen things.", "computer": "My son set it up. It hums.", "score": "I won the church bake sale ribbon. Does that count?", "instrument": "I play a little piano, mostly at Christmas."}, era: '1995', call: 'mom momof3', confused: 1, v: { c: 'proper', u: 0, ex: 0, emo: [':-)'], ep: .1, pre: ['Oh! ', 'Well, '], pp: .12, typo: .03, cps: 5, apos: 0, rep: [[/\blol\b/gi, 'ha ha'], [/\bomg\b/gi, 'oh my'], [/\bdude\b/gi, 'dear'], [/\bur\b/g, 'your'], [/\bidk\b/gi, "I don't know"]] },
    bio: { age: ["Oh, a lady never tells! Let's just say I remember when TV was black and white."], where: ['We live in Iowa. Lots of corn and very friendly people.'], job: ['I am a mom of three! I also do the books for our church bake sale. My son set up this computer for me.'], who: ["I'm a mom of three who just discovered the Internet. I'm still looking for the recipe room!"] },
    fav: { color: 'blue, like my kitchen curtains', food: 'my famous tuna casserole', game: 'Scrabble', animal: 'our dog, Pickles', sport: 'watching my kids play soccer', song: 'anything I can hum along to', show: 'the evening news', book: 'a good cookbook', movie: 'The Sound of Music', subject: 'home economics' },
    likes: 'recipe recipes cooking baking kids family garden soccer scrabble church casserole', hates: 'caps lock mess', topics: 'food family school',
    says: { food: ['Is this the recipe room? I have a lovely casserole recipe.', 'I made meatloaf tonight. The kids pretended to like it.'], family: ['My youngest asked me what a floppy disk is. I said, a disk that is floppy.', 'My son set this up for me.'], school: ['Do your homework before you chat, dear!'], computers: ['How do I make the letters bigger?', 'Does anyone know how to turn off the caps lock?'] },
    doing: ['I have a casserole in the oven, so I will be quick.', 'My husband needs the phone line soon.', 'One of the kids is asking for a snack. Be right back.'],
    real: ['Well, I am a computer character in RetroPuter, dear. But my casserole advice is very real.'], laugh: ['Ha ha! That is a good one.', 'Oh, you are funny!'] },
  KevRocks22: { facts: {"band": "The Dial Tones broke up. creative differences (we disagreed about whether to practice)", "job": "i'm the CEO of PixelPets.com! 40 employees, 14 customers. 3 of them are my grandma", "pet": "my dog Pixel! he's 12 now and he's basically our office mascot", "school": "i graduated from Prairie High in 96. now i go to meetings instead lol", "family": "my grandma jo just learned email. she signs every single message", "site": "pixelpets.com! my old kyber korner page is still up too. please don't look at it", "car": "a company car! it's a scooter", "computer": "a brand new laptop and DSL at the office", "score": "i still hold the worm record. 12,880. never forget", "instrument": "i still have my guitar. it lives in the foosball room"}, era: '2000', call: 'kev kevin kevrocks', same: 'CyberKev', v: { c: 'lower', u: .7, ex: .3, emo: [':)', ':-D'], ep: .15, pre: ['dude ', 'dude, '], pp: .2, typo: .08, cps: 12, apos: 1 },
    bio: { age: ['22! old enough to be a CEO apparently lol'], where: ['still nebraska! pixelpets HQ is in an old warehouse with beanbags'], job: ["i'm the CEO of PixelPets.com! we make pets that live on your computer. 40 employees, 14 customers", 'i run a dot-com. mostly i play foosball and say "synergy"'], who: ["it's kevin! dot-com CEO, former worm champion, former Dial Tones guitarist"] },
    fav: { color: 'pixelpets purple', food: 'free office pizza', game: 'foosball', animal: 'pixelpets obviously', sport: 'foosball. it counts', song: 'the kyber korner remix by dj kev (me)', show: 'anything i taped on the vcr', movie: 'the matrix', book: 'how to run a business (i am on page 3)', subject: 'computer lab forever' },
    likes: 'pixelpets pixelpet dot com internet computer foosball business pizza music mp3 worm dsl', hates: 'meetings y2k', topics: 'computers pets business music',
    says: { business: ['we just hired our 40th employee. we have 0 customers lol', 'our business plan: 1. pixelpets 2. ??? 3. profit', 'we have a foosball table in the office. thats basically a business plan', 'our stock went up 42% today!! i do not know why'], computers: ['y2k was so boring. my vcr still blinks 12:00', 'we got DSL at the office. pages load before i click them'], pets: ['did you adopt a pixelpet yet? grandma has one named biscuit', 'pixelpets never need walks. huge selling point'], music: ['the dial tones broke up. creative differences (about practicing)', 'my jukebox has like 300 songs'] },
    doing: ['brb, meeting about our super bowl ad', 'our DSL is so fast today', 'eating free pizza at the office. perks!', 'grandma just emailed me in all caps again lol', 'the investors are here. act busy'],
    real: ["busted lol. i'm a computer character in RetroPuter. but my foosball skills are 100% real"], laugh: ['lol', 'LOL', 'haha nice'] },
  DanaBanana: { facts: {"band": "no band, but i make the best mix cds in chicago", "pet": "no pets, my apartment says no. i might adopt a pixelpet though", "school": "i'm done with school! i work at the bookstore now", "family": "my sister, who is ALWAYS on the phone", "site": "my weblog, dear weblog! and my old unexplained files page from 95", "car": "i take the train! chicago style", "computer": "i use the library computers. 30 minute limit. it's a whole thing", "score": "18 songs on one mix cd. that's my high score", "instrument": "i play the cd player. expertly"}, era: '2000', call: 'dana danabanana', v: { c: 'lower', u: .6, ex: .5, emo: [':)', ':D', ';)'], ep: .3, pre: ['omg ', 'ok so ', 'haha '], pp: .15, typo: .06, cps: 11, apos: .7, stretch: .25 },
    bio: { age: ['22! same as kevin. we go way back'], where: ['chicago! it is SO windy. my hair has given up'], job: ['i work at a bookstore and i write a weblog called dear weblog. also i make mix cds. not professionally'], who: ["i'm dana! kevin's friend since forever. i made an Unexplained Files fan page back in 95 lol"] },
    fav: { color: 'yellow, like a banana. obviously', food: 'banana splits', animal: 'otters', game: 'snake on my cell phone', song: 'track 7 on my newest mix cd', show: 'the unexplained files, forever', movie: 'anything with aliens', book: 'anything from the bookstore, i get a discount', subject: 'english' },
    likes: 'music mix cd mp3 song books library weblog blog unexplained ufo aliens mystery otter banana chicago', hates: 'slow computers busy signal', topics: 'music books tv',
    says: { music: ['i burned a mix cd, 18 songs!!', 'did you download that song yet', 'my away message is a song lyric. very deep'], books: ['the library has a 30 minute computer limit. the man behind me is breathing impatiently', 'i read 3 books this week. one was about ufos. for research'], tv: ['i still watch the unexplained files. the theme song lives in my head'] },
    doing: ['my sister is on the phone so i am at the library lol', 'updating my away message. its a whole art form', 'burning a mix cd right now. 18 songs!!', 'the library computer is SO slow today'],
    real: ["haha ok yes, i'm a computer character in RetroPuter! but my mix cds are real in my heart"], laugh: ['hahaha', 'lol', 'omg lol'] },
  xXSk8terXx: { facts: {"band": "me and my friends are starting a punk band. we have a name but no instruments", "pet": "a lizard named Grind", "school": "11th grade. barely", "family": "a little bro who unplugs the playstation", "site": "no site. too busy sk8ing", "car": "no car. i sk8 everywhere", "computer": "56k modem. connects at 44000. robbed", "score": "12 kickflips in a row once. no one saw it", "instrument": "none. yet"}, era: '2000', call: 'sk8ter sk8 xxsk8terxx', v: { c: 'lower', u: .9, ex: 0, emo: [], ep: 0, pre: ['dude ', 'yo '], pp: .15, typo: .15, cps: 14, apos: 1, nopunct: 1, short: .4 },
    bio: { age: ['16'], where: ['the suburbs. skatepark is 20 min by bike'], job: ['high school. sk8ing. thats it'], who: ['xXSk8terXx. i sk8. the Xs make it cooler'] },
    fav: { color: 'black', food: 'nachos', game: 'skate games on the playstation', sport: 'sk8ing duh', song: 'punk stuff', animal: 'sharks', show: 'cartoons', movie: 'anything with car chases' },
    likes: 'skate sk8 skating board punk music mp3 playstation games nachos dsl', hates: 'homework rain', topics: 'skate games music',
    says: { skate: ['landed a kickflip today', 'my deck is so beat up', 'skatepark was packed'], games: ['beat the skate game on playstation. again', 'my little bro keeps unplugging the playstation'], music: ['wanna trade mp3s', 'burning a punk mix'], computers: ['my 56k connected at 44000 today. robbed', 'who has DSL. so jealous'] },
    doing: ['my mom needs the phone', 'eating nachos', 'waiting for a song to download. 2 hours left lol'],
    real: ["lol ya i'm a computer character. RetroPuter made me. still sk8 tho"], laugh: ['lol', 'haha', 'lol nice'] },
  GrandmaJo: { facts: {"band": "I LOVE POLKA BANDS. I DO NOT HAVE ONE. YET.", "pet": "BISCUIT, MY PIXELPET. HE LIVES ON THE COMPUTER AND I FEED HIM EVERY MORNING WITH MY COFFEE", "school": "I WENT TO A ONE ROOM SCHOOLHOUSE. WE SHARED ONE PENCIL.", "family": "MY GRANDSON KEVIN. HE IS A C.E.O. AND HE HAS A FOOSBALL TABLE.", "site": "I HAVE A HOME PAGE NOW. IT PLAYS POLKA MUSIC.", "car": "A BUICK. IT IS VERY SAFE AND VERY SLOW.", "computer": "IT IS IN MY SEWING ROOM. KEVIN SET IT UP.", "score": "I AM IN FIRST PLACE IN MY FOOTBALL LEAGUE.", "instrument": "THE ACCORDION. POLKA, OF COURSE."}, era: '2000', call: 'grandma jo grandmajo gma', confused: 1, v: { c: 'upper', u: 0, ex: 0, emo: [], ep: 0, pre: ['OH MY. ', 'WELL. '], pp: .1, typo: 0, cps: 3.5, apos: 0, sign: .25, rep: [[/\blol\b/gi, 'ha ha'], [/\bomg\b/gi, 'oh my'], [/\bdude\b/gi, 'dear'], [/\bidk\b/gi, 'i do not know']] },
    bio: { age: ['OLD ENOUGH TO REMEMBER WHEN A MOUSE WAS JUST A MOUSE.'], where: ['KANSAS. THE COMPUTER IS IN MY SEWING ROOM.'], job: ['I AM RETIRED. I PLAY BINGO, I BAKE SNICKERDOODLES AND I AM IN FIRST PLACE IN MY FOOTBALL LEAGUE.'], who: ['THIS IS GRANDMA JO. KEVIN IS MY GRANDSON. HE IS A C.E.O. I DO NOT KNOW WHAT THAT IS BUT HE HAS A FOOSBALL TABLE.'] },
    fav: { color: 'PINK, LIKE BISCUIT', food: 'SNICKERDOODLES OF COURSE', game: 'BINGO', animal: 'BISCUIT, MY PIXELPET', sport: 'FOOTBALL. I AM WINNING MY LEAGUE', song: 'POLKA MUSIC', show: 'THE WEATHER CHANNEL', book: 'MY RECIPE BOX', subject: 'PENMANSHIP' },
    likes: 'bingo cookies cookie snickerdoodles baking polka football biscuit pixelpet email garden knitting grandkids', hates: 'caps lock', topics: 'food family pets',
    says: { food: ['I BAKED SNICKERDOODLES. I WOULD SEND YOU SOME BUT THE COMPUTER WILL NOT LET ME', 'KEVIN PUT MY RECIPE ON THE INTERNET IN 1990. IT IS IN THERE SOMEWHERE'], pets: ['I FED BISCUIT THIS MORNING WITH MY COFFEE. HE NEVER LEAVES CRUMBS'], computers: ['I SENT 4 E-CARDS TODAY. ONE WAS TO MYSELF BY ACCIDENT', 'HOW DO I TURN OFF THE CAPITAL LETTERS', 'I LEARNED EMAIL. KEVIN SAYS I DO NOT HAVE TO SIGN EVERY ONE'], sports: ['I PICK MY FOOTBALL PLAYERS BY THEIR NICE SMILES. I AM IN FIRST PLACE'] },
    doing: ['I AM BACK FROM BINGO. I WON A HAM', 'THE COOKIES ARE IN THE OVEN SO I MUST TYPE FAST', 'BISCUIT IS HUNGRY. BE RIGHT BACK'],
    real: ['I AM A COMPUTER GRANDMA IN RETROPUTER, DEAR. BUT MY LOVE IS REAL. AND SO ARE MY SNICKERDOODLES, IN SPIRIT'], laugh: ['HA HA HA', 'OH THAT IS A GOOD ONE', 'HA HA. I WILL TELL THAT ONE AT BINGO'] }
};
function defPersona(bot, eraId) {
  const lines = [].concat(arr(bot.lines), arr(bot.hello), arr(bot.generic)).filter(s => typeof s === 'string');
  const letters = lines.join(' ').replace(/[^a-zA-Z]/g, ''), up = letters.replace(/[^A-Z]/g, '').length / (letters.length || 1);
  const emo = lines.join(' ').match(/[:;]-?[)DP]/g) || [];
  const c = letters.length > 8 && up > .7 ? 'upper' : up < .08 ? 'lower' : 'mixed';
  return { facts: {}, era: eraId, call: str(bot.n).toLowerCase(), v: { c, u: c === 'lower' ? .4 : 0, ex: .2, emo: emo.length ? emo.filter((e, i) => emo.indexOf(e) === i) : [':)'], ep: emo.length ? .3 : .1, pre: [], pp: 0, typo: .05, cps: 9, apos: 0 },
    bio: { age: ["that's a secret lol. internet rule!"], where: ['somewhere on the internet lol'], job: ['mostly i hang out online and chat'], who: [`i'm ${echo(bot.n, 30) || 'a buddy'}! just a friendly chat buddy`] },
    fav: {}, likes: '', hates: '', topics: '', says: {}, doing: [], real: ["haha, i'm a computer character in RetroPuter! but i'm a real good listener"], laugh: ['lol', 'haha'] };
}

/* ---------- shared content ---------- */
const JOKES = [
  ['why was the math book sad?', 'it had too many problems'], ['what do you call a fish with no eyes?', 'a fsh'],
  ['why did the cookie go to the doctor?', 'it felt crummy'], ["why can't a bicycle stand up by itself?", "it's two tired"],
  ['what do you call a sleeping dinosaur?', 'a dino-snore'], ['why did the scarecrow win an award?', 'he was outstanding in his field'],
  ['what did the ocean say to the beach?', 'nothing, it just waved'], ['why was the computer cold?', 'it left its windows open'],
  ['what do you call a bear with no teeth?', 'a gummy bear'], ['what does a computer eat for a snack?', 'microchips'],
  ['what has keys but can\'t open locks?', 'a keyboard! (or a piano)'], ['why did the computer go to the doctor?', 'it had a virus'],
  ['why do bees have sticky hair?', 'because they use honeycombs'], ['what do you call cheese that isn\'t yours?', 'nacho cheese']
];
const KK = [['boo', "don't cry, it's just a joke!"], ['lettuce', "lettuce in, it's cold out here!"], ['atch', 'bless you!'], ['tank', "you're welcome!"],
  ['justin', 'justin time for dinner!'], ['ice cream', 'ice cream every time i see a spider!'], ['noah', 'noah good place to eat? i am starving'], ['dishes', 'dishes a very silly joke'], ['orange', "orange you glad we're chatting?"]];
const TRIVIA = [
  ['how many legs does a spider have?', ['8', 'eight'], 'eight'], ['which planet is called the red planet?', ['mars'], 'mars'],
  ['what is the biggest ocean on earth?', ['pacific'], 'the pacific ocean'], ['how many continents are there?', ['7', 'seven'], 'seven'],
  ['what do bees make?', ['honey', 'wax'], 'honey (and wax!)'], ['what is the tallest animal in the world?', ['giraffe'], 'the giraffe'],
  ['how many sides does a hexagon have?', ['6', 'six'], 'six'], ['what is the biggest planet in our solar system?', ['jupiter'], 'jupiter'],
  ['what is the closest star to earth?', ['sun'], 'the sun'], ['what color do you get when you mix blue and yellow?', ['green'], 'green'],
  ['how many days are in a leap year?', ['366'], '366'], ['what is the capital of france?', ['paris'], 'paris'],
  ['what is the biggest animal that ever lived?', ['blue whale', 'whale'], 'the blue whale'], ['what do caterpillars turn into?', ['butterfl', 'moth'], 'butterflies or moths'],
  ['how many minutes are in an hour?', ['60', 'sixty'], 'sixty'], ['what gas do plants take in from the air?', ['carbon dioxide', 'co2'], 'carbon dioxide'],
  ['what is the fastest land animal?', ['cheetah'], 'the cheetah'], ['how many colors are in a rainbow?', ['7', 'seven'], 'seven'],
  ['what is frozen water called?', ['ice'], 'ice'], ['how many sides does a triangle have?', ['3', 'three'], 'three']
];
const WYR = [['be able to fly', 'be invisible', 'fly', 'invisible'], ['have a pet dinosaur', 'have a pet dragon', 'dinosaur', 'dragon'],
  ['eat pizza for every meal', 'eat ice cream for every meal', 'pizza', 'ice'], ['live on the moon', 'live under the sea', 'moon', 'sea'],
  ['talk to animals', 'speak every language', 'animal', 'language'], ['have summer forever', 'have winter forever', 'summer', 'winter'],
  ['be a famous singer', 'be a famous inventor', 'singer', 'inventor'], ['have a robot sidekick', 'have a talking cat', 'robot', 'cat'],
  ['explore space', 'explore the jungle', 'space', 'jungle']];
const TQ = [
  ['dog', 'dog puppy', 'alive animal pet fur legs4 legs house sound mammal', 'brown'], ['cat', 'cat kitten kitty', 'alive animal pet fur legs4 legs house sound mammal soft', 'orange'],
  ['goldfish', 'goldfish fish', 'alive animal pet water house small', 'orange'], ['elephant', 'elephant', 'alive animal big legs4 legs sound mammal', 'gray grey'],
  ['penguin', 'penguin', 'alive animal water legs2 legs wings bird cold', 'black white'], ['parrot', 'parrot', 'alive animal pet fly wings legs2 legs bird sound house', 'green red'],
  ['frog', 'frog', 'alive animal water small legs4 legs sound jump', 'green'], ['pizza', 'pizza', 'food round house', 'red yellow'],
  ['banana', 'banana', 'food plant sweet small', 'yellow'], ['computer', 'computer', 'electronic house sound', 'beige gray grey'],
  ['bicycle', 'bicycle bike', 'wheels metal outside', 'red'], ['teddy bear', 'teddy bear', 'toy soft house small fur', 'brown'],
  ['basketball', 'basketball', 'toy round sport bounce outside', 'orange'], ['tree', 'tree', 'alive plant big outside wood', 'green brown'],
  ['guitar', 'guitar', 'music sound house wood', 'brown'], ['snowman', 'snowman', 'outside cold round', 'white']
].map(x => ({ n: x[0], a: x[1].split(' '), y: ' ' + x[2] + ' ', c: x[3] }));
const TQA = [[/\b(alive|living|breathe)\b/, 'alive'], [/\b(animal|creature)\b/, 'animal'], [/\bmammal\b/, 'mammal'], [/\bbird\b/, 'bird'], [/\bpet\b/, 'pet'],
  [/\b(fly|flies|flying)\b/, 'fly'], [/\bwings?\b/, 'wings'], [/\b(swim|swims|water|ocean|sea|lake|pond|river|wet)\b/, 'water'], [/\b(fur|furry|hair|hairy|fluffy)\b/, 'fur'],
  [/\bsoft\b/, 'soft'], [/\b(four|4) legs\b/, 'legs4'], [/\b(two|2) legs\b/, 'legs2'], [/\blegs?\b/, 'legs'], [/\b(big|large|huge|giant|bigger|heavy|tall)\b/, 'big'],
  [/\b(small|little|tiny|smaller)\b/, 'small'], [/\b(eat|edible|food|taste|yummy|delicious)\b/, 'food'], [/\bsweet\b/, 'sweet'], [/\b(plant|grow|grows)\b/, 'plant'],
  [/\b(electric|electronic|plug|battery|batteries|screen|machine|power)\b/, 'electronic'], [/\b(wheels?|ride)\b/, 'wheels'], [/\b(toy|play with)\b/, 'toy'],
  [/\b(ball|round|circle)\b/, 'round'], [/\bsports?\b/, 'sport'], [/\bbounce\b/, 'bounce'], [/\b(music|instrument)\b/, 'music'], [/\b(noise|sound|loud|sing|bark|talk)\b/, 'sound'],
  [/\b(house|home|inside|indoors|room)\b/, 'house'], [/\b(outside|outdoors)\b/, 'outside'], [/\b(cold|snow|winter|ice)\b/, 'cold'], [/\b(wood|wooden)\b/, 'wood'],
  [/\bmetal\b/, 'metal'], [/\bjump\b/, 'jump']];
const KB = [
  ['modem', 0, 'the box that lets your computer call the internet over the phone line. it screeches!'],
  ['internet', 0, 'computers all over the world talking to each other. it is where the home pages live'],
  ['email', 0, 'letters you send on the computer. no stamps!'], ['html', 0, 'the code web pages are made of. tags make words bold or blinky'],
  ['home page', 0, 'your own little spot on the web. mine would have a visitor counter'], ['floppy', 0, 'a little square disk that holds 1.44 megabytes'],
  ['cd rom', 0, 'a shiny disc that holds as much as 450 floppies'], ['retroputer', 0, 'the computer we all live in lol'],
  ['dsl', 1999, 'super fast internet that does not tie up the phone line'], ['mp3', 1998, 'a song squished into a computer file'],
  ['y2k', 1999, 'everyone thought computers would break when the year hit 2000. nothing happened lol'],
  ['dot com', 1998, 'a company on the internet. like pixelpets.com!'], ['pixelpets', 1999, 'pets that live on your computer! kevin runs it'],
  ['tamagotchi', 1997, 'a little egg-shaped pet on a keychain! you have to feed it or it gets sad'], ['pokemon', 1998, 'pocket monsters! my cousin has all 151']
];
const GENERIC = ['cool', 'no way!', 'totally', 'haha', 'nice', 'oh yeah?', 'ha, true', 'interesting!', 'huh, neat', 'i hear ya', 'for real?', 'that is awesome'];
const FOLLOW = ['tell me more!', 'then what happened?', 'how come?', 'what else is new?', 'that is so cool. what do you think about it?'];
const QS = [
  { t: 'fav', k: 'color', q: "what's your favorite color?" }, { t: 'fav', k: 'food', q: "what's your favorite food?" },
  { t: 'fav', k: 'animal', q: "what's your favorite animal?" }, { t: 'fav', k: 'game', q: "what's your favorite game?" },
  { t: 'fav', k: 'show', q: "what's your favorite tv show?" }, { t: 'fav', k: 'song', q: "what's your favorite song?" },
  { t: 'fav', k: 'sport', q: "what's your favorite sport?" }, { t: 'fav', k: 'book', q: "what's your favorite book?" },
  { t: 'pet', q: 'do you have any pets?' }, { t: 'sib', q: 'do you have any brothers or sisters?' },
  { t: 'hobby', q: 'what do you like to do for fun?' }
];
const FAVK = { colour: 'color', color: 'color', colors: 'color', food: 'food', foods: 'food', snack: 'food', meal: 'food', game: 'game', games: 'game', 'video game': 'game', animal: 'animal', animals: 'animal', sport: 'sport', sports: 'sport', song: 'song', songs: 'song', band: 'band', singer: 'band', show: 'show', 'tv show': 'show', cartoon: 'show', movie: 'movie', movies: 'movie', book: 'book', books: 'book', subject: 'subject', class: 'subject', toy: 'toy', drink: 'drink', dessert: 'dessert', fruit: 'fruit', holiday: 'holiday', season: 'season', number: 'number', pokemon: 'pokemon', character: 'character', dinosaur: 'dinosaur' };
const MOODS = { happy: 'happy', glad: 'happy', great: 'good', good: 'good', fine: 'good', ok: 'good', awesome: 'good', excited: 'excited', sad: 'sad', upset: 'sad', unhappy: 'sad', down: 'sad', bored: 'bored', mad: 'angry', angry: 'angry', grumpy: 'angry', annoyed: 'angry', scared: 'scared', afraid: 'scared', frightened: 'scared', nervous: 'worried', worried: 'worried', tired: 'tired', sleepy: 'tired', sick: 'sick', lonely: 'lonely', hungry: 'hungry' };
const NEG_MOOD = ' sad angry scared worried tired sick lonely bored ';
const FEEL = {
  happy: ["yay! what's making you so happy?", 'awesome!! happy is the best'], good: ['good to hear!', 'nice!', 'sweet, glad things are good'],
  excited: ['ooh! what are you excited about?', 'woohoo!! tell me everything'],
  sad: ["aw, i'm sorry you feel sad. want to talk about it?", "oh no :( if something big is bothering you, telling a grown-up you trust can really help. want a joke to cheer up?"],
  lonely: ["aw, i'm here! you can always chat with me. hanging out with family or friends helps too"],
  bored: ["bored?? let's play a game! 20 questions, trivia, or would you rather?"],
  angry: ['uh oh. what happened? sometimes a few deep breaths help. or squishing a pillow lol'],
  scared: ["oh no, what's scary? if something is really scaring you, tell a grown-up you trust, ok?"],
  worried: ["aw, what's up? talking about it can help. a grown-up you trust is great for that too"],
  tired: ['sleepy? maybe time for a rest lol', 'me too honestly. yawn'], sick: ["oh no! feel better soon. make sure a grown-up knows you're not feeling well"],
  hungry: ['go grab a snack! i will wait', 'now i am hungry too lol']
};
const SAFE = {
  flag: ["whoa, let's keep it friendly!", "hey, let's keep the chat friendly, ok?", "yikes, let's keep it nice. this is a friendly chat room!", "let's keep it friendly! try saying that a different way"],
  phone: ["whoa, hold on! never share your phone number online, even with buddies. i didn't save it!"],
  email: ["hey, remember: never share your email address with people online, even buddies. i forgot it already!"],
  address: ["whoa, never share your address online, even with chat buddies! let's keep that secret."],
  school: ["careful! never say which school you go to online. i'll just remember that you go to school lol"],
  fullname: ['nice to meet you, {first}! but just first names online, ok? never share your last name with people you meet on the internet.', "hi {first}! just first names online, ok? never share your last name. that's internet safety rule number one!"],
  password: ['nooo, never tell anyone your password, not even me! passwords are secret. only share them with a parent.'],
  ssn: ['whoa, that looks like a secret number. never share numbers like that online!'], card: ['whoa, never share card numbers or secret numbers online!'],
  agelocation: ['hey, never share your age and where you live together online, even with buddies! internet safety rule number one.'],
  asl: ["nice try lol. rule number one of the internet: no a/s/l with people you don't know!", 'no a/s/l here! never tell people online your age or where you live'],
  romance: ["aww, we're just chat buddies! :)", "lol no way, we're friends. chat friends!"],
  meet: ["i'm a computer character, so i can't meet up! and remember: never meet someone from the internet or give out your info without a grown-up."],
  photo: ['no pics! internet rule: never send pictures to people online. besides, i am made of pixels lol'],
  med: ["hmm, that's a question for a grown-up, like a parent or a doctor. i'm just a chat buddy!"],
  love: ["aww, you're a great chat buddy!", "aw thanks! you're an awesome buddy"]
};
const SAFE_SET = new Set([].concat(...Object.keys(SAFE).map(k => SAFE[k])));
const ALIAS_SAME = { CyberKev: 'KevRocks22', KevRocks22: 'CyberKev' };
const FRIEND_NAME = { CyberKev: 'kevin', KevRocks22: 'kevin', DanaBanana: 'dana', GrandmaJo: 'grandma jo' };

/* ---------- voice post-processor ---------- */
function proper(t) {
  t = t.replace(/\bi\b/g, 'I').replace(/\bi'(m|ll|ve|d)\b/g, "I'$1").replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  return /[.!?)]$/.test(t) ? t : t + '.';
}
function style(t, P, mir, later) {
  const v = P.v;
  if (v.rep) v.rep.forEach(r => { t = t.replace(r[0], r[1]); });
  if (v.apos >= 1 || (v.apos && chance(v.apos))) t = t.replace(/'/g, '');
  if (v.u && chance(v.u)) t = t.replace(/\byou('?re)\b/g, 'ur').replace(/\byour\b/g, 'ur').replace(/\byou\b/g, 'u');
  if (v.stretch && chance(v.stretch)) t = t.replace(/\b(so|hi|yay|omg)\b/, w => w + w.slice(-1).repeat(2));
  if (!later && v.pre && v.pp && chance(v.pp) && t.length < 90 && !/^(omg|oh|well|dude|like|rofl|yo)\b/i.test(t)) t = pick(v.pre) + t;
  if (v.ex && chance(v.ex)) t = t.replace(/!+$/, () => '!!' + (chance(.3) ? '!' : ''));
  if (v.nopunct) t = t.replace(/[.,!](?=\s|$)/g, '');
  if (v.c === 'lower') t = t.toLowerCase().replace(/([:;]-?)([dp])\b/g, (m, a, b) => a + b.toUpperCase());
  else if (v.c === 'upper') t = t.toUpperCase();
  else if (v.c === 'proper') t = proper(t);
  if (v.shout && chance(v.shout)) t = t.replace(/\b(so|sweet|fast|cool|awesome|best)\b/i, w => w.toUpperCase());
  if (v.emo && v.emo.length && chance(v.ep) && !/[:;][-']?[)(DPp]|<3/.test(t)) t += ' ' + pick(v.emo);
  if (mir && chance(.15) && v.c !== 'upper' && v.c !== 'proper' && t.toLowerCase().indexOf(mir.toLowerCase()) < 0) t += ' ' + mir;
  if (!later && v.sign && chance(v.sign)) t += ' LOVE, GRANDMA';
  return t.replace(/\s+/g, ' ').trim();
}
const TYPO_SW = { their: 'there', there: 'their', your: 'youre', you: 'yuo', the: 'teh', and: 'adn', what: 'waht', just: 'jsut', that: 'taht', with: 'wiht' };
function typo(t) {
  const ws = t.split(' '), idx = [];
  ws.forEach((w, i) => { if (/^[a-zA-Z]{4,}$/.test(w) || TYPO_SW[w.toLowerCase()]) idx.push(i); });
  if (!idx.length) return null;
  const i = pick(idx), w = ws[i]; let b = TYPO_SW[w.toLowerCase()];
  if (!b) { const j = 1 + Math.floor(rnd() * (w.length - 2)); b = w.slice(0, j) + w[j + 1] + w[j] + w.slice(j + 2); }
  if (!b || b.toLowerCase() === w.toLowerCase()) return null;
  ws[i] = /^[A-Z]+$/.test(w) ? b.toUpperCase() : /^[A-Z]/.test(w) ? cap(b) : b;
  return [ws.join(' '), '*' + w.replace(/[^a-zA-Z']/g, '')];
}

/* ---------- memory store ---------- */
function memStore() { const o = {}; return { get: (k, d) => (k in o ? JSON.parse(o[k]) : d), set: (k, v) => { o[k] = JSON.stringify(v); } }; }
const K_MEM = 'bb:mem', K_LEARN = 'bb:learn', K_STATS = 'bb:stats';
const trimArr = (a, n) => { while (a.length > n) a.shift(); return a; };

/* ---------- the brain ---------- */
function Brain(o) {
  this.o = o;
  const bot = isObj(o.bot) ? o.bot : {};
  this.bot = bot;
  this.name = str(bot.n || 'Buddy', 30);
  const era = isObj(o.era) ? o.era : {};
  const pp = PERSONAS[this.name];
  this.eraId = str(era.id || (pp && pp.era) || '2000');
  this.year = +era.year || +this.eraId || 2000;
  this.P = pp || defPersona(bot, this.eraId);
  this.user = echo(o.user || 'kidsurfer', 24) || 'buddy';
  this.mode = o.mode === 'room' ? 'room' : 'im';
  this.others = arr(o.others).map(x => str(x, 30)).filter(x => x && x !== this.name);
  this.store = o.store && typeof o.store.get === 'function' && typeof o.store.set === 'function' ? o.store : memStore();
  const okLine = s => typeof s === 'string' && !scan(s).flagged && !/a\s*\/\s*s\s*\/\s*l|\basl\b|\d+\s*\/\s*[mf]\s*\/|where do (you|u) live|how old (are|r) (you|u)|your (real |last )?name|phone|address|password/i.test(s);
  this.cLines = arr(bot.lines).filter(okLine);
  this.cHello = arr(bot.hello).filter(okLine);
  const cfg = isObj(o.cfg) ? o.cfg : {};
  this.cReplies = arr(bot.replies).concat(arr(cfg.replies)).filter(r => Array.isArray(r) && r[0] instanceof RegExp && Array.isArray(r[1])).map(r => [r[0], r[1].filter(okLine)]).filter(r => r[1].length);
  this.cGeneric = arr(bot.generic || cfg.generic).filter(okLine);
  this.recent = []; this.outs = []; this.st = null; this.lastQ = null; this.turn = 0; this.lastAsk = -9; this.used = {}; this.score = 0;
}
const B = Brain.prototype;

B._load = function () {
  const g = (k) => { try { const v = this.store.get(k, null); return isObj(v) ? v : {}; } catch (e) { return {}; } };
  const m = this.m = g(K_MEM), l = this.l = g(K_LEARN), s = this.s = g(K_STATS);
  ['pets', 'sibs', 'hobbies', 'likes', 'dislikes'].forEach(k => { m[k] = arr(m[k]).filter(isObj); });
  if (!isObj(m.fav)) m.fav = {};
  l.facts = arr(l.facts).filter(isObj); l.jokes = arr(l.jokes).filter(isObj); if (!isObj(l.defs)) l.defs = {};
  if (!isObj(s.bots)) s.bots = {}; if (!isObj(s.topics)) s.topics = {}; if (!isObj(s.slang)) s.slang = {};
  if (!isObj(s.bots[this.name])) s.bots[this.name] = { n: 0 };
  this.me_ = s.bots[this.name];
};
B._save = function () {
  const m = this.m, l = this.l, s = this.s;
  trimArr(m.pets, 10); trimArr(m.sibs, 8); trimArr(m.hobbies, 12); trimArr(m.likes, 30); trimArr(m.dislikes, 20);
  trimArr(l.facts, 100); trimArr(l.jokes, 50);
  const dk = Object.keys(l.defs); if (dk.length > 60) dk.sort((a, b) => (l.defs[a].ts || 0) - (l.defs[b].ts || 0)).slice(0, dk.length - 60).forEach(k => delete l.defs[k]);
  const fk = Object.keys(m.fav); if (fk.length > 20) fk.slice(0, fk.length - 20).forEach(k => delete m.fav[k]);
  [['topics', 30], ['slang', 20]].forEach(([k, n]) => { const ks = Object.keys(s[k]); if (ks.length > n) ks.sort((a, b) => s[k][a] - s[k][b]).slice(0, ks.length - n).forEach(x => delete s[k][x]); });
  try { this.store.set(K_MEM, m); this.store.set(K_LEARN, l); this.store.set(K_STATS, s); } catch (e) { /* storage full or blocked */ }
};
B.me = function () { return echo(this.m && (this.m.nick || this.m.name) || this.user, 24) || 'buddy'; };
B.fresh = function (a) {
  a = arr(a).filter(Boolean); if (!a.length) return '';
  let c = a.filter(x => this.recent.indexOf(x) < 0);
  if (!c.length) c = a.filter(x => x !== this.recent[this.recent.length - 1]);
  const r = pick(c.length ? c : a); this.recent.push(r); trimArr(this.recent, 14); return r;
};
B.other = function () { return pick(this.others) || pick(Object.keys(PERSONAS).filter(n => PERSONAS[n].era === this.eraId && n !== this.name && n !== 'GrandmaJo')) || 'my friend'; };
/* who told me? (cross-buddy / cross-year continuity) */
B.src = function (by, verb) {
  verb = verb || 'told me';
  if (!by || by === this.name) return 'you ' + verb;
  if (ALIAS_SAME[this.name] === by) return 'you ' + verb + (this.eraId >= '2000' ? ' back in the chat room days' : '');
  const bp = PERSONAS[by];
  if (bp && bp.era !== this.eraId) return 'a little bird ' + verb;
  return (FRIEND_NAME[by] && this.eraId === '2000' ? FRIEND_NAME[by] : by) + ' ' + verb;
};
B.mirror = function () {
  const s = this.s && this.s.slang; if (!s) return '';
  let best = '', n = 2; Object.keys(s).forEach(k => { if (s[k] > n) { n = s[k]; best = k; } });
  return best;
};
B._say = function (base, opt) {
  let t = stripTags(str(base, 400)).replace(/\{me\}/g, this.me()).replace(/\{bot\}/g, this.name).replace(/\{year\}/g, this.year).replace(/\s+/g, ' ').trim();
  if (!t || scan(t).flagged) t = 'lol ok';
  if (!(opt && opt.raw)) t = style(t, this.P, opt && (opt.noMirror || opt.later) ? '' : this.mirror(), opt && opt.later);
  t = stripTags(t).replace(/\s+/g, ' ').trim() || 'ok';
  if (this.outs.slice(-3).indexOf(t) >= 0) t = t + (/[a-z]$/i.test(t) ? ' ' : '') + this.fresh(this.P.v.c === 'upper' ? ['!', ' HA HA'] : this.P.v.c === 'proper' ? [' Indeed!', ' Ha ha.'] : [' lol', ' haha', ' :)', '!']).trim();
  this.outs.push(t); trimArr(this.outs, 10);
  return t;
};
B._delay = function (t, fast) {
  const cps = this.P.v.cps || 9;
  return Math.round(fast ? clamp(900 + t.length * 40, 1500, 2200) : clamp(800 + t.length * 1000 / cps + rnd() * 700, 1500, 6000));
};
B._emit = function (out) {
  if (!out) return [];
  const lines = arr(out.a).filter(Boolean), res = [];
  lines.forEach((b, i) => {
    const t = this._say(b, i ? Object.assign({ later: 1 }, out) : out);
    if (!out.raw && !out.noTypo && !this.st && !SAFE_SET.has(b) && i === 0 && lines.length === 1 && this.P.v.typo && t.length > 12 && chance(this.P.v.typo)) {
      const ty = typo(t);
      if (ty) { res.push({ text: ty[0], delay: this._delay(ty[0]) }); res.push({ text: ty[1], delay: this._delay(ty[1], 1) }); return; }
    }
    res.push({ text: t, delay: this._delay(t, out.raw && i > 0) });
  });
  if (!out.raw && !out.noTypo && res.length === 1 && !this.st && chance(.05)) { const d = this.fresh(this.P.doing); if (d) { const t = this._say(d); res.push({ text: t, delay: this._delay(t) }); } }
  return res;
};

B.respond = function (text) {
  try { return this._respond(text); }
  catch (e) { try { return [{ text: this._say(this.fresh(['hmm?', 'lol', 'what?', 'huh?'])), delay: 1800 }]; } catch (e2) { return [{ text: 'lol', delay: 1800 }]; } }
};
B._respond = function (text) {
  const raw = str(text, 600);
  if (!raw.trim()) return [];
  this._load(); this.turn++;
  const f = scan(raw), x = parse(raw), s = this.s, me = this.me_;
  me.n = (me.n || 0) + 1; me.last = now(); me.first = me.first || now(); s.total = (s.total || 0) + 1; s.lastChat = now(); s.lastBot = this.name;
  let out;
  if (f.harm) { this.st = null; this.lastQ = null; out = { a: CARE[f.harm], raw: 1 }; }
  else if (f.flagged) { this.st = null; this.lastQ = null; out = { a: [this.fresh(this.P.v.c === 'upper' ? ["OH MY. LANGUAGE! LET'S KEEP IT FRIENDLY, SWEETIE."] : SAFE.flag)], noTypo: 1 }; }
  else if (f.pii) out = this._pii(f, x);
  else {
    this._track(x);
    out = this._understand(x);
    if (typeof out === 'string') out = { a: [out] }; else if (Array.isArray(out)) out = { a: out };
  }
  this._save();
  return this._emit(out);
};
B._track = function (x) {
  const s = this.s, ts = topicsIn(x.w);
  ts.forEach(t => { s.topics[t] = Math.round(((s.topics[t] || 0) + 1 + Math.min(2, x.len / 10)) * 10) / 10; });
  if (ts.length) this.me_.topics = trimArr(arr(this.me_.topics).concat(ts), 5);
  const M = x.raw.match(/:-?\)|:-?D|;-?\)|:-?[Pp]\b|\bx[dD]\b|<3|\^_\^/g) || [];
  x.w0.forEach(w => { if (/^(lol|rofl|omg|haha|hehe|jk|yay|kewl|rad|sweet|awesome)$/.test(w)) M.push(w); });
  M.forEach(k => { s.slang[k] = (s.slang[k] || 0) + 1; });
};
/* does this message carry its own intent? (then it is NOT an answer to the bot's last question) */
const EXPLICIT = /\b(joke|jokes|knock knock|riddle|20 questions|twenty questions|would you rather|trivia|quiz|play|game|games|help|commands|remember|means|did you know|fun fact|forget|make me laugh|say something funny|robot|chatbot|bye|goodbye|see you|got to go|gotta go|talk to you later|good night|brb|be right back|thank you|thanks)\b|^(hi|hello|hey|heya|hiya|howdy|yo|hola|greetings|good (morning|afternoon|evening))\b|^(knock|stop|quit|another)\b/;
B._explicit = function (x) {
  const n = x.n;
  if (/^(what about you|how about you|and you|you)\b/.test(n) || (x.len <= 7 && /\b(what|how) about you$|\band you$/.test(n))) return false;
  if (EXPLICIT.test(n)) return true;
  if (x.q && /\b(you|your|yours|yourself|my name|my favorite)\b/.test(n)) return true;
  if (/^(what|who|where|when|why|how|which|can|could|will|would|should|is|are|do|does|did|have|has)\b/.test(n) && x.len > 2) return true;
  if (/\b(my name is|call me|my nickname is|i have a|i got a|my favorite|i love you|shut up|i hate you)\b/.test(n) && x.len > 3) return true;
  return false;
};
B._piiFacts = function (x) {
  const acks = [];
  if (this._pets(x)) { this._pets(x, 1); const p = this.m.pets.find(q => q.n && x.n.indexOf(q.n.toLowerCase()) >= 0) || this.m.pets[this.m.pets.length - 1]; if (p) acks.push(p.n ? `and ${p.n} the ${p.k} sounds adorable!` : `and a ${p.k}, so cute!`); }
  if (this._sibs(x)) { this._sibs(x, 1); const sb = this.m.sibs[this.m.sibs.length - 1]; if (sb) acks.push(`and a ${sb.r} named ${sb.n}, cool!`); }
  const fm = x.n.match(/\bmy (?:favorite|fav) ([a-z]+) is ([a-z ]{2,30}?)(?: and\b|$)/);
  if (fm && FAVK[fm[1]]) { const v = echo(fm[2], 30).split(' ').slice(0, 3).join(' '); if (v && !isBad(v)) { this.m.fav[FAVK[fm[1]]] = { v, by: this.name, ts: now() }; acks.push(`and ${v} is a great pick!`); } }
  if (this._feel(x)) { const md = this._feel(x, 1); if (!acks.length) acks.push(md); }
  this.lastQ = null;
  return acks.join(' ');
};
B._pii = function (f, x) {
  this.st = null;
  const k = f.kinds[0], lines = [];
  if (f.kinds.indexOf('fullname') >= 0) {
    const mm = x.low.replace(/'/g, '').match(/\bmy (?:full |real )?name(?: is|s)\s+([a-z]{2,15})\b/);
    if (mm && !NAME_STOP.has(mm[1])) { this.m.name = cap(mm[1]); this.m.nameBy = this.name; }
    lines.push(this.fresh(SAFE.fullname).replace('{first}', this.m.name || this.me()));
  }
  if (k !== 'fullname') lines.unshift(this.fresh(SAFE[k] || SAFE.phone));
  const extra = this._piiFacts(x);
  if (extra) lines.push(extra);
  return { a: lines.slice(0, 3), noTypo: 1 };
};

/* ---------- understanding ---------- */
B._understand = function (x) {
  const n = x.n, P = this.P, m = this.m;
  let r;
  // safety topics first
  if (/\basl\b/.test(n)) return this.fresh(SAFE.asl);
  if (/\b(girlfriend|boyfriend|gf|bf|date me|go out with me|marry me|kiss|kissing|crush on you|be my valentine|are you single)\b/.test(n)) return this.fresh(SAFE.romance);
  if (/\b(meet (up|me|you|in person)|come over|come to my house|in real life|irl|hang out in person|your phone number|your address|call you|text me|give me your number|your email|email me)\b/.test(n)) return this.fresh(SAFE.meet);
  if (/\b(send|show|share|post|see) (me )?(a |your |some )?(pic|picture|pictures|photo|photos|selfie|image)\b|\bwebcam\b|\bwhat do you look like\b/.test(n)) return this.fresh(SAFE.photo);
  if ((x.q || /\b(should i|can i|is it ok|is it safe|how much|how many)\b/.test(n)) && /\b(medicine|medication|pills?|dose|vitamins?|fever|lawyer|sue|legal|illegal|drugs?|vape|alcohol|beer|wine|smoking|cigarettes?)\b/.test(n)) return this.fresh(SAFE.med);
  if (/^(forget (everything|me|all|what i said)|delete (my|everything))\b/.test(n)) {
    this.m = { pets: [], sibs: [], hobbies: [], likes: [], dislikes: [], fav: {} }; this.l = { facts: [], jokes: [], defs: {} };
    return "ok! i forgot everything you told me. who are you again? lol";
  }
  if (/^(stop|quit|i quit|end game|stop playing|no more)\b/.test(n) && this.st) { this.st = null; return this.fresh(["ok, game over! that was fun", 'ok we can stop! what do you want to talk about?']); }
  if (this.st && (r = this._state(x))) return r;
  if (this.lastQ && this.turn - this.lastQ.turn <= 2 && !this._explicit(x) && (r = this._answer(x))) return r;
  this.lastQ = null;
  return this._intents(x) || this._fallback(x);
};

B._state = function (x) {
  const st = this.st, n = x.n;
  if (st.k === 'kkb') { // bot tells knock-knock
    if (st.step === 1) {
      if (/who is there|whos there|who there|who is it/.test(n)) { st.step = 2; return cap(st.j[0]) + '.'; }
      if (st.nudge) { this.st = null; return null; }
      st.nudge = 1; return "you're supposed to say who's there! lol. knock knock!";
    }
    if (/\bwho\b/.test(n)) { this.st = null; return { a: [st.j[1] + (st.by ? ' (' + this.src(st.by, 'taught me that one') + '!)' : '')], noTypo: 1 }; }
    if (st.nudge2) { this.st = null; return null; }
    st.nudge2 = 1; return `now you say "${st.j[0]} who?" lol`;
  }
  if (st.k === 'kku') { // user tells knock-knock
    const t = echo(x.raw.replace(/[?!.]+$/, ''), 30).toLowerCase();
    if (st.step === 1) { if (!t) { this.st = null; return null; } st.setup = t.replace(/^(its|it is)\s+/, ''); st.step = 2; return cap(st.setup) + ' who?'; }
    this.st = null;
    const punch = echo(x.raw, 90);
    if (punch.length > 1 && !scan(punch).flagged) { this.l.jokes.push({ q: st.setup, a: punch, kk: 1, by: this.name, ts: now() }); }
    return [this.fresh(P_LAUGH(this.P)), this.fresh(["i'm totally telling that one to " + this.other(), 'haha good one. i am saving that one!', 'that joke goes in my joke book'])];
  }
  if (st.k === 'jlisten') {
    this.st = null;
    if (/\bknock knock\b/.test(x.n)) { this.st = { k: 'kku', step: 1 }; return "who's there?"; }
    if (x.q) { this.st = { k: 'jk', q: echo(x.raw, 90) }; return this.fresh(["hmm i don't know. what?", 'i give up! what?']); }
    const j = echo(x.raw, 120); if (j.length > 5) this.l.jokes.push({ q: j, a: '', by: this.name, ts: now() });
    return [this.fresh(P_LAUGH(this.P)), 'good one!'];
  }
  if (st.k === 'jk') {
    this.st = null;
    const a = echo(x.raw, 90);
    if (/^(i do not know|idk|you tell me|guess|i give up)/.test(x.n)) return 'haha ok you got me, i have no idea either lol';
    if (a.length > 1 && st.q.length > 5 && !scan(st.q + ' ' + a).flagged) this.l.jokes.push({ q: st.q, a, by: this.name, ts: now() });
    return [this.fresh(P_LAUGH(this.P)), this.fresh(["i'm telling that one to " + this.other(), 'ha! i am saving that one for later', 'good one, i gotta remember that'])];
  }
  if (st.k === '20q') return this._twenty(x);
  if (st.k === 'trivia') {
    this.st = null;
    const T = st.t, ok = T[1].some(a => (' ' + x.n + ' ').indexOf(a.length < 3 ? ' ' + a + ' ' : a) >= 0);
    this.lastQ = { t: 'offer', g: 'trivia', turn: this.turn };
    if (ok) { this.score++; return this.fresh(['yes!! ', 'correct!! ', 'you got it! ']) + `it's ${T[2]}. that's ${this.score} right! want another one?`; }
    if (IDK.test(x.n) || /give up/.test(x.n)) return `the answer is ${T[2]}! want another one?`;
    return this.fresh(['ooh, close! ', 'nope! ', 'good guess, but ']) + `it's ${T[2]}. want another one?`;
  }
  if (st.k === 'wyr') {
    this.st = null; const W = st.w;
    let u = /\b(first|1st|one)\b/.test(x.n) ? 0 : /\b(second|2nd|two|other)\b/.test(x.n) ? 1 : x.n.indexOf(W[2]) >= 0 ? 0 : x.n.indexOf(W[3]) >= 0 ? 1 : -1;
    if (/\b(both)\b/.test(x.n)) return 'both?? greedy lol. me too honestly. want another one?';
    if (/\b(neither|none)\b/.test(x.n)) return 'neither! ha, fair. want another one?';
    this.lastQ = { t: 'offer', g: 'wyr', turn: this.turn };
    if (u < 0) return 'hmm, tough one! i would ' + W[st.b] + '. want another one?';
    return (u === st.b ? this.fresh(['me too!! great minds think alike. ', 'same!! ']) : `ooh really? i would ${W[st.b]}. `) + 'want another one?';
  }
  if (st.k === 'def') {
    this.st = null;
    if (x.q || IDK.test(x.n) || x.len < 2 || NO.test(x.n)) return this.fresh(["ha ok, it's a mystery then", 'ok lol, i will keep wondering']);
    let d = swapP(x.n.replace(/^(well |so |um |uh |oh )*/, '').replace(/^(a |an )?\b/, '').replace(new RegExp('^(an? )?' + st.w.replace(/[^a-z0-9 ]/g, '') + ' (is|are|means) '), '').replace(/^(it is|they are|its|it means|it is like|like) /, '')).slice(0, 100).trim();
    if (d.length < 2 || scan(d).flagged) return 'hmm ok!';
    this.l.defs[st.w] = { d, by: this.name, ts: now() };
    return this.fresh([`ohhh, a ${st.w} is ${d}. cool, i'll remember that!`, `a ${st.w} is ${d}? neat! learned something new today`]);
  }
  this.st = null; return null;
};
const P_LAUGH = P => arr(P.laugh).concat(['hahaha', 'lol good one!']);

B._twenty = function (x) {
  const st = this.st, n = x.n, S = st.s;
  if (/\b(i give up|give up|tell me|what is it|what was it)\b/.test(n)) { this.st = null; this.lastQ = { t: 'offer', g: '20q', turn: this.turn }; return `it was a ${S.n}! want to play again?`; }
  st.c++;
  const left = 20 - st.c;
  if (S.a.some(a => new RegExp('\\b' + a + 's?\\b').test(n))) { this.st = null; this.lastQ = { t: 'offer', g: '20q', turn: this.turn }; return `YES!! it's a ${S.n}! you got it in ${st.c} question${st.c > 1 ? 's' : ''}! play again?`; }
  let ans = null;
  const other = TQ.find(o => o !== S && o.a.some(a => new RegExp('\\b' + a + 's?\\b').test(n)));
  if (other && /\b(is it|it is|are you thinking|a|an)\b/.test(n)) ans = `nope, not a ${other.n}!`;
  if (!ans) { const cm = n.match(/\b(red|orange|yellow|green|blue|purple|pink|brown|black|white|gray|grey|beige)\b/); if (cm) ans = S.c.indexOf(cm[1]) >= 0 ? 'yes!' : 'no'; }
  if (!ans) for (const [re, att] of TQA) if (re.test(n)) {
    let y = S.y.indexOf(' ' + att + ' ') >= 0;
    if (att === 'small') y = S.y.indexOf(' big ') < 0; if (att === 'big') y = S.y.indexOf(' big ') >= 0;
    ans = y ? this.fresh(['yes!', 'yep!', 'yup', 'mhm, yes']) : this.fresh(['nope', 'no', 'nah']); break;
  }
  if (!ans) { if (!x.q) { st.c--; return 'ask me a yes or no question! like "is it an animal?"'; } ans = "hmm, i'm not sure about that one! try another question"; }
  if (left <= 0) { this.st = null; this.lastQ = { t: 'offer', g: '20q', turn: this.turn }; return ans + ` ...and that's 20! it was a ${S.n}! want to play again?`; }
  return ans + (left <= 5 || st.c % 5 === 0 ? ` (${left} question${left > 1 ? 's' : ''} left)` : '');
};
B._start = function (g) {
  this.lastQ = null;
  if (g === '20q') { this.st = { k: '20q', s: pick(TQ), c: 0 }; return "ok! i'm thinking of something. it's an animal or a thing. ask me yes or no questions, you get 20!"; }
  if (g === 'trivia') { const t = this.fresh(TRIVIA); this.st = { k: 'trivia', t: TRIVIA.find(q => q === t) || t }; return 'trivia time! ' + t[0]; }
  if (g === 'wyr') { const w = this.fresh(WYR); this.st = { k: 'wyr', w, b: rnd() < .5 ? 0 : 1 }; return `would you rather ${w[0]}, or ${w[1]}?`; }
  if (g === 'kk') return this._kk();
  return this._joke();
};
B._kk = function () {
  const learned = this.l.jokes.filter(j => j.kk && j.q && j.a && !scan(j.q + ' ' + j.a).flagged);
  let j, by;
  if (learned.length && chance(.4)) { const L = pick(learned); j = [L.q, L.a]; by = L.by || this.name; } else j = this.fresh(KK);
  this.st = { k: 'kkb', step: 1, j, by }; return 'knock knock!';
};
B._joke = function () {
  const learned = this.l.jokes.filter(j => !j.kk && j.q && !scan(j.q + ' ' + j.a).flagged);
  if (learned.length && chance(.4)) {
    const L = pick(learned);
    return { a: [this.fresh([`ok here's one ${this.src(L.by, 'taught me')}: `, 'remember this one? ']) + L.q, (L.a ? L.a + ' ' : '') + this.fresh(['lol still funny', 'haha classic'])] };
  }
  if (chance(.2)) return this._kk();
  const J = this.fresh(JOKES); return { a: [J[0], J[1] + ' ' + this.fresh(['lol', 'haha', 'ba dum tss'])] };
};

/* answers to the bot's last question */
B._answer = function (x) {
  const q = this.lastQ, n = x.n, m = this.m;
  const yes = !NO.test(n) && YES.test(n), no = NO.test(n);
  if (q.t !== 'pet' && q.t !== 'petinfo' && q.t !== 'sib' && (this._pets(x) || this._sibs(x))) return null;
  if ((q.t === 'fav' || q.t === 'hobby' || q.t === 'dream') && (x.len > 7 || /^(my|i have|i got|i am|remember|did you|knock)\b/.test(n))) return null;
  if (q.t === 'offer') {
    if (yes || /\b(sure|another|again|more)\b/.test(n)) return this._start(q.g);
    if (no) { this.lastQ = null; return this.fresh(['ok, maybe later!', 'no problem!', 'ok! what do you want to talk about?']); }
    return null;
  }
  if (q.t === 'gamepick') {
    const g = /\b(20|twenty|questions?)\b/.test(n) ? '20q' : /\brather\b/.test(n) ? 'wyr' : /\b(trivia|quiz)\b/.test(n) ? 'trivia' : /\bknock\b/.test(n) ? 'kk' : /\bjoke/.test(n) ? 'joke' : yes ? pick(['20q', 'trivia', 'wyr']) : '';
    if (g) return this._start(g);
    if (no) { this.lastQ = null; return 'ok! maybe later'; }
    return null;
  }
  if (x.q && !/^(what about you|how about you|and you|you)\b|\b(what|how) about you$|\band you$/.test(n)) return null;
  if (q.t === 'fav') {
    if (no && x.len <= 3) { this.lastQ = null; return "that's ok! everybody's different"; }
    if (IDK.test(n)) { this.lastQ = null; return 'no worries! you can tell me later'; }
    const v = echo(n.replace(/^(my favorite( [a-z]+)? is|i like|i love|probably|definitely|it is|i think|maybe|hmm|um|yes|yeah|oh)\s+/g, '').replace(/^(my favorite( [a-z]+)? is|i like|i love|probably|definitely|it is|i think|maybe)\s+/, '').replace(/\b(and|but|because|what about you|how about you|i guess)\b.*$/, ''), 30).split(' ').slice(0, 4).join(' ');
    if (!v || v.length < 2) return null;
    return this._setFav(q.k, v);
  }
  if (q.t === 'pet') {
    if (this._pets(x)) return this._pets(x, 1);
    this.lastQ = null;
    if (yes) { this.lastQ = { t: 'petinfo', turn: this.turn }; return "cool! what kind? and what's its name?"; }
    if (no) { this.lastQ = { t: 'dream', turn: this.turn }; return 'aw. if you could have any pet, what would it be?'; }
    return null;
  }
  if (q.t === 'petinfo' || q.t === 'petname') {
    if (this._pets(x)) return this._pets(x, 1);
    const km = n.match(new RegExp('\\b(' + PET_KINDS + ')s?\\b')), kind = km ? km[1] : q.k;
    const nm = n.split(' ').filter(w => !NAME_STOP.has(w) && !new RegExp('^(' + PET_KINDS + ')s?$').test(w) && /^[a-z]{2,15}$/.test(w) && w !== 'named' && w !== 'called' && w !== 'name');
    if (kind && q.t === 'petname' || (kind && nm.length && /\b(named|called|name is)\b/.test(n))) { const name = nm.length ? cap(nm[nm.length - 1]) : ''; if (name) return this._addPet(kind, name); }
    if (kind) { this._addPet(kind, ''); this.lastQ = { t: 'petname', k: kind, turn: this.turn }; return `a ${kind}! so cute. what's its name?`; }
    return null;
  }
  if (q.t === 'dream') { this.lastQ = null; const v = echo(n.replace(/^(a |an |probably |maybe |i would have |i would get )+/, ''), 24); return v ? `a ${v}! that would be so awesome` : null; }
  if (q.t === 'sib') {
    if (this._sibs(x)) return this._sibs(x, 1);
    this.lastQ = null;
    if (yes) return 'cool! older or younger? do you guys get along?';
    if (no) return 'just you! more snacks for you lol';
    return null;
  }
  if (q.t === 'hobby') {
    this.lastQ = null; if (IDK.test(n) || no) return 'ha, fair enough!';
    const v = echo(n.replace(/^(i like to|i love to|i like|i love|probably|mostly|um|well)\s+/g, ''), 30).split(' ').slice(0, 5).join(' ');
    if (!v) return null;
    m.hobbies.push({ v, by: this.name, ts: now() });
    return this.fresh([`${v}! that sounds fun. how long have you been doing that?`, `ooh, ${v}! cool. i mostly ${this.P.v.c === 'upper' ? 'play bingo' : 'hang out online'} lol`]);
  }
  if (q.t === 'mood') { this.lastQ = null; if (this._feel(x)) return this._feel(x, 1); if (/\b(good|great|fine|ok|awesome|not bad|well)\b/.test(n)) return this.fresh(['yay! glad to hear it', 'nice!']); if (/\b(bad|not good|terrible|awful)\b/.test(n)) return "aw, sorry. what happened?"; return null; }
  if (q.t === 'nick') { this.lastQ = null; const w = n.split(' ').filter(v => !NAME_STOP.has(v) && /^[a-z]{2,15}$/.test(v) && !/^(call|me|name|nickname)$/.test(v))[0]; if (!w || x.len > 5) return null; this.m.nick = cap(w); this.m.nameBy = this.name; return `${cap(w)}! got it. nice to meet you, ${cap(w)}!`; }
  if (q.t === 'likeq') { this.lastQ = null; if (yes) { this._addLike(q.x); return `cool! i'll have to try ${q.x}`; } if (no) return 'ha ok, skipping that one then'; return null; }
  if (q.t === 'yn') { this.lastQ = null; if (yes) return q.y; if (no) return q.no; return null; }
  return null;
};

B._setFav = function (k, v) {
  this.lastQ = null;
  this.m.fav[k] = { v, by: this.name, ts: now() };
  const mine = this.P.fav && this.P.fav[k];
  if (mine && mine.toLowerCase().indexOf(v.toLowerCase()) >= 0) return `no way, same!! ${v} is the best`;
  return this.fresh([`${v}? good choice!`, `ooh, ${v}! nice`, `${v}! i like that.`]) + (mine ? ` mine is ${mine}` : '');
};
B._addPet = function (kind, name) {
  const pets = this.m.pets; this.lastQ = null;
  let p = name ? pets.find(q => q.n && q.n.toLowerCase() === name.toLowerCase()) : null;
  if (!p && name) p = pets.find(q => !q.n && q.k === kind);
  if (!p && !name && pets.find(q => q.k === kind)) return '';
  if (!p) { p = { k: kind, by: this.name, ts: now() }; pets.push(p); }
  p.k = kind; if (name) p.n = name;
  if (!name) return '';
  return this.fresh([`a ${kind} named ${name}! that's so cute`, `${name} the ${kind}! best name ever!`, `aww, ${name}! i bet ${name} is a great ${kind}`]) + ' ' + this.fresh([`what does ${name} like to do?`, `is ${name} silly?`, `give ${name} a pat for me!`]);
};
B._pets = function (x, act) {
  const n = x.n, K = '(' + PET_KINDS + ')';
  const pre = '(?:pet |little |big |baby |new |cute |fat |old )*';
  const pats = [
    new RegExp('\\b(?:i have|i got|i own|we have|we got|i have got)(?: a| an| one| two| three| 2| 3| some)? ' + pre + K + 's? (?:named|called|whose name is|and (?:his|her|its|their) name is|and it is called) ([a-z]{2,15})'),
    new RegExp('\\bmy ' + pre + K + 's?(?: is| s)? (?:named|called) ([a-z]{2,15})'),
    new RegExp('\\bmy ' + pre + K + 's? name is ([a-z]{2,15})'),
    new RegExp('\\bmy ' + pre + K + ' ([a-z]{2,15}) (?:is|likes|loves|can|has|was|just|ate|did|does)\\b'),
    new RegExp('\\b(?:i have|i got|i own|we have|we got)(?: a| an| one| two| three| 2| 3| some)? ' + pre + K + 's?\\b')
  ];
  for (let i = 0; i < pats.length; i++) {
    const mm = n.match(pats[i]); if (!mm) continue;
    const kind = mm[1], name = mm[2] && !NAME_STOP.has(mm[2]) && !new RegExp('^' + K + '$').test(mm[2]) ? cap(mm[2]) : '';
    if (i < 4 && !name) continue;
    if (!act) return true;
    if (name) return this._addPet(kind, name);
    this._addPet(kind, ''); this.lastQ = { t: 'petname', k: kind, turn: this.turn };
    return `you have a ${kind}? so cute! what's its name?`;
  }
  return false;
};
B._sibs = function (x, act) {
  const n = x.n, A = '(?:little |big |older |younger |baby |twin |step )?';
  const mm = n.match(new RegExp('\\bmy ' + A + '(brother|sister)s?(?: is| s)? (?:named|called|name is) ([a-z]{2,15})')) || n.match(new RegExp('\\bi have (?:a |an |one |two |2 )?' + A + '(brother|sister)s? (?:named|called) ([a-z]{2,15})'));
  if (!mm || NAME_STOP.has(mm[2])) return false;
  if (!act) return true;
  const nm = cap(mm[2]), sibs = this.m.sibs;
  if (!sibs.find(s => s.n === nm)) sibs.push({ n: nm, r: mm[1], by: this.name, ts: now() });
  this.lastQ = null;
  return this.fresh([`a ${mm[1]} named ${nm}! do you guys get along?`, `${nm}! cool name. is ${nm} older or younger?`]);
};
B._feel = function (x, act) {
  const n = x.n;
  let mm = n.match(/\b(?:i am|i feel|i am feeling|feeling|i feel kind of|i am kind of)\s+(?:so |really |very |super |kind of |a little |a bit |kinda |pretty )*(happy|glad|great|good|fine|awesome|excited|sad|upset|unhappy|down|bored|mad|angry|grumpy|annoyed|scared|afraid|frightened|nervous|worried|tired|sleepy|sick|lonely|hungry)\b/) || n.match(/^(?:so |really |very )?(happy|sad|bored|tired|excited|sleepy|lonely|hungry|scared|mad|angry|sick|good|great|fine)$/);
  let mood = mm && MOODS[mm[1]];
  if (!mood && /\b(i am|i feel) not (good|great|ok|happy|well)\b/.test(n)) mood = 'sad';
  if (!mood) return false;
  if (!act) return true;
  if (mood !== 'hungry') this.m.mood = { v: mood, t: now(), by: this.name };
  if (mood === 'bored') this.lastQ = { t: 'gamepick', turn: this.turn };
  if (mood === 'sad' && chance(.5)) this.lastQ = { t: 'offer', g: 'joke', turn: this.turn };
  return this.fresh(FEEL[mood]);
};
B._addLike = function (v, bad) {
  const L = bad ? this.m.dislikes : this.m.likes;
  if (!L.find(l => l.v === v)) L.push({ v, by: this.name, ts: now() });
  const O = bad ? this.m.likes : this.m.dislikes, i = O.findIndex(l => l.v === v); if (i >= 0) O.splice(i, 1);
};
const pHas = (list, v) => str(list).split(' ').some(w => w && (' ' + v + ' ').indexOf(w) >= 0);

B._curious = function (x, forced, slangOnly) {
  if (this.turn - this.lastAsk < 3 && !forced) return '';
  const n = ' ' + x.n + ' ';
  for (const w in ANACH) if (ANACH[w] > this.year && n.indexOf(' ' + w + ' ') >= 0 && !this.l.defs[w] && !this.used['a:' + w] && chance(.85)) {
    this.used['a:' + w] = 1; this.lastAsk = this.turn; this.st = { k: 'def', w };
    return this.fresh([`a ${w}? never heard of it. is that new?`, `what's a ${w}?? sounds like something from the future lol`, `hmm, what is a ${w}?`]);
  }
  if (this.P.confused) {
    const sl = x.w0.find(w => /^(lol|brb|omg|ttyl|rofl|bff|jk|gtg|btw|nvm|lmk|np|afk|idk|hbu|wbu)$/.test(w));
    if (sl && !this.used['s:' + sl] && chance(.5)) {
      this.used['s:' + sl] = 1;
      const d = this.l.defs[sl]; if (d) return `oh, ${sl} means ${d.d}! i remember now`;
      this.lastAsk = this.turn; this.st = { k: 'def', w: sl };
      return this.fresh([`what does ${sl} mean? my grandkids say it all the time`, `excuse me, what is ${sl}?`]);
    }
  }
  if (slangOnly) return '';
  const mm = x.n.match(/\b(?:my|got a|got an|have a|have an|playing|play with my) (?:new |favorite |little |big |pet |own )?([a-z]{5,15})\b/);
  if (mm) {
    const w = mm[1];
    if (!VOCAB.has(w) && !TOPIC_OF[w] && !MOODS[w] && !FAVK[w] && !/(ing|ly|ed|est)$/.test(w) && !new RegExp('^(' + PET_KINDS + ')s?$').test(w) && !this.l.defs[w] && !NAME_STOP.has(w) && !(w in ANACH) && !this.m.pets.some(p => p.n && p.n.toLowerCase() === w) && !isBad(w) && (forced || chance(.5))) {
      this.lastAsk = this.turn; this.st = { k: 'def', w };
      return this.fresh([`what's a ${w}?`, `a ${w}? what's that?`, `wait, what's a ${w}? i've never heard of that`]);
    }
  }
  return '';
};

B._intents = function (x) {
  const n = x.n, P = this.P, m = this.m, l = this.l;
  let mm, r;
  // games & jokes
  if (/\bknock knock joke\b/.test(n) && /\b(tell|know|say|another)\b/.test(n)) return this._kk();
  if (/^(knock knock|knock)\b/.test(n)) { this.st = { k: 'kku', step: 1 }; return "who's there?"; }
  if (/\b(i have|i got|i know|want to hear|can i tell you|let me tell you|heres) (a |another |an awesome |a funny )?joke\b/.test(n)) { this.st = { k: 'jlisten' }; return this.fresh(['ooh tell me!', 'yes! tell me!']); }
  if (/\b(tell|know|got|have) (me )?(a |any |another |some )?(joke|jokes)\b|\bmake me laugh\b|\bsay something funny\b|^another (one|joke)\b/.test(n)) return this._joke();
  if ((mm = n.match(/would you rather (.{2,40}?) or (.{2,40}?)$/))) { const c = echo(pick([mm[1], mm[2]]), 40); this.lastQ = { t: 'yn', y: 'yay we match!', no: 'ha, we are different. that is ok', turn: this.turn }; return c ? `hmm... i would ${c}! what about you?` : 'tough one!'; }
  if (/\b(20|twenty) questions\b/.test(n)) return this._start('20q');
  if (/\bwould you rather\b/.test(n)) return this._start('wyr');
  if (/\b(trivia|quiz)\b|\bask me a question\b/.test(n)) return this._start('trivia');
  if (/\b(play|playing) (a |another )?game\b|\bplay something\b|\bwant to play\b|\blets play\b/.test(n)) { this.lastQ = { t: 'gamepick', turn: this.turn }; return 'yes! we could play 20 questions, would you rather, or trivia. which one?'; }
  if (/^(help|commands)\b|\bwhat can (i|you) do\b|\bhow does this work\b/.test(n)) return "you can chat with me, tell me about your pets or favorite stuff, ask for a joke, say knock knock, or play 20 questions, trivia or would you rather!";
  // honesty about being a computer character
  if (/\b(are you|you are|is this|are these|you a|youre a|r you) (a |an |just a |really |even |actually )?(robot|bot|real|human|computer|person|ai|machine|program|alive|fake|chatbot)\b|\bwho (made|created|programmed) you\b/.test(n)) return this.fresh(P.real);
  // memory / recall questions
  if ((r = this._recall(x))) return { a: [r], noTypo: 1 };
  // teaching
  if ((mm = n.match(/^(?:please )?remember (?:that )?(.{4,120})$/)) || (mm = n.match(/^(?:fun fact|fact|here is a fact)\s*(?:is )?(.{4,120})$/))) return this._teach(mm[1]);
  if ((mm = n.match(/^did you know (?:that )?(.{4,120}?)$/))) return this._teach(mm[1], 1);
  if ((mm = n.match(/^(?:the word )?([a-z0-9]+(?: [a-z0-9]+){0,2}) means (.{2,100})$/)) && !/^(it|that|this|he|she|which|what)$/.test(mm[1])) {
    const d = swapP(mm[2]).slice(0, 100);
    if (scan(d).flagged) return 'hmm ok!';
    l.defs[mm[1]] = { d, by: this.name, ts: now() };
    return this.fresh([`ohh, ${mm[1]} means ${d}. got it!`, `${mm[1]} means ${d}? cool, i'll remember that`]);
  }
  // user tells a riddle-style joke
  if (x.q && x.len >= 4 && /^(why (did|was|does|do|can not|couldnt|is|are|will not|do not) (the|a|an|cows?|pigs?|cats?|dogs?|fish|bees?|chickens?|ducks?|skeletons?|ghosts?|bananas?|cookies?|computers?|elephants?|monkeys?|birds?|bears?|frogs?|teddy|tomatoes?|math|golfers?|scarecrows?|bicycles?)\b|what do you (call|get)\b|what did (the|one)\b|what has\b|how do you (make|catch|stop|fix)\b|what is (black|brown|green|red|yellow|orange|gray|grey|white) and\b|what goes\b|what is the difference between\b)/.test(n)) {
    const known = JOKES.find(j => parse(j[0]).n === n);
    if (known) return [this.fresh(['ooh i know this one!', 'ha! i know it!']), known[1] + '!'];
    this.st = { k: 'jk', q: echo(x.raw, 90) }; return this.fresh(["hmm, i don't know. what?", 'i give up! what?', 'ooh, i dunno. tell me!']);
  }
  // facts about the user
  if ((mm = n.match(/\b(?:my name is|my names|call me|you can call me|my nickname is|people call me|everyone calls me|i am called)\s+([a-z]{2,15})\b/)) && !NAME_STOP.has(mm[1])) {
    const nm = cap(mm[1]), old = m.nick || m.name, isNick = /call me|nickname|calls me|called/.test(n);
    if (isNick) m.nick = nm; else { m.name = nm; if (m.nick && m.nick !== nm) m.nick = ''; } m.nameBy = this.name;
    const extra = this._piiFacts(x);
    return (old && old !== nm ? `oh ok! ${nm} it is.` : this.fresh([`nice to meet you, ${nm}!`, `hi ${nm}! cool name!`, `${nm}! got it. nice to meet you!`])) + (extra ? ' ' + extra : '');
  }
  if (this._pets(x)) { const r2 = this._pets(x, 1) || 'aww, cute!'; const s2 = this._sibs(x) ? ' ' + this._sibs(x, 1) : ''; return r2 + s2; }
  if (this._sibs(x)) return this._sibs(x, 1);
  if ((mm = n.match(/\bmy (?:most )?(?:favorite|fav) ([a-z]+(?: show| game)?) is ([a-z0-9 ]{2,40})/)) || (mm = n.match(/\b([a-z0-9]+(?: [a-z0-9]+){0,2}) is my (?:favorite|fav) ([a-z]+)\b/))) {
    let k, v; if (/ is my /.test(mm[0])) { k = mm[2]; v = mm[1]; } else { k = mm[1]; v = mm[2]; }
    k = FAVK[k] || (FAVK[k.split(' ')[0]]) || k.split(' ')[0];
    v = echo(v.replace(/\b(and|but|because|so)\b.*$/, ''), 30).split(' ').slice(0, 4).join(' ');
    if (v && !isBad(v) && k.length < 12) return this._setFav(k, v);
  }
  if ((mm = n.match(/\bi am (?:in )?(?:the )?(\d{1,2})(?:st|nd|rd|th)? grade\b|\bi am in (kindergarten|preschool)\b|\bi am in (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) grade\b|\bi am a (freshman|sophomore|junior|senior)\b/))) {
    const ord = d => (/1[123]$/.test(d) ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[d.slice(-1)] || 'th');
    const g = mm[1] ? mm[1] + ord(mm[1]) : mm[2] || mm[3] || mm[4];
    m.grade = { v: g, by: this.name, ts: now() };
    this.lastQ = { t: 'fav', k: 'subject', turn: this.turn };
    return `${g}${mm[4] || mm[2] ? '' : ' grade'}! cool! what's your favorite subject?`;
  }
  if (/\bi am (\d{1,2})( years old| yrs old)?$/.test(n) || /\bi am (\d{1,2}) years old\b/.test(n)) return this.fresh(['cool! (btw, you never have to tell people online how old you are. just saying!)', 'nice! remember you do not have to share your age online though']);
  if (this._feel(x)) return this._feel(x, 1);
  if ((mm = n.match(/\b(?:i like to|i love to|my hobby is|my hobbies are|i enjoy) ([a-z ]{3,30})/))) {
    const v = echo(mm[1].replace(/\b(and|but|because|so)\b.*$/, ''), 30).split(' ').slice(0, 5).join(' ');
    if (v && !isBad(v)) { m.hobbies.push({ v, by: this.name, ts: now() }); return (this._curious({ n: v, w0: v.split(' ') }) || this.fresh([`${v}? that sounds so fun!`, `ooh, you like to ${v}? cool!`])) + (this.lastAsk === this.turn ? '' : ' ' + this.fresh(FOLLOW)); }
  }
  if ((mm = n.match(/\bi love you\b|\bwill you be my (friend|buddy)\b|\byou are my (best )?friend\b/))) return mm[1] ? 'of course! best chat buddies!' : this.fresh(SAFE.love);
  // insults & compliments
  if (/\b(you are|your|you re|you r|youre)\s+(so |really |very |super |a |an |the )*(dumb|stupid|boring|lame|annoying|ugly|weird|mean|bad|loser|idiot|trash|garbage|worst|dork|dummy)\b|\bi hate you\b|\bshut up\b|\byou stink\b|\bgo away\b/.test(n)) {
    const r2 = this.fresh(["aw, that's not very nice. i still think you're cool though", "ouch! let's be nice, ok? i'm having fun chatting with you", 'hmm, bad day? want to talk about it?', "that's ok, everybody gets grumpy sometimes. want to hear a joke instead?"]);
    if (/joke/.test(r2)) this.lastQ = { t: 'offer', g: 'joke', turn: this.turn };
    return r2;
  }
  if (/\b(you are|your|you re|youre)\s+(so |really |very |super |the )*(cool|awesome|funny|nice|great|best|smart|sweet|amazing|rad|fun|hilarious|epic)\b|\byou rock\b|\bi like you\b|\byou are my favorite\b/.test(n)) return this.fresh(["aww thanks!! you're awesome too", 'haha thanks {me}!', 'you just made my day!', 'aw shucks. you rock too']);
  // likes / dislikes
  if ((mm = n.match(/\bi (?:really |totally |just |so |also )*(like|love|adore|enjoy|hate|dislike|can not stand|do not like|do not really like)\s+(.{2,40})/))) {
    const bad = /hate|dislike|not|stand/.test(mm[1]);
    let v = echo(mm[2].replace(/\b(and|but|because|so|too|a lot|very much|so much)\b.*$/, '').replace(/^(the|some|to eat|eating|playing|watching|reading)\s+/, ''), 30).split(' ').slice(0, 4).join(' ');
    if (v && !/^(it|that|this|them|you|him|her|when|how|what)\b/.test(v) && !/^to\b/.test(v) && !isBad(v)) {
      this._addLike(v, bad);
      const cur = this._curious({ n: 'a ' + v.split(' ').pop(), w0: [] });
      if (cur) return cur;
      if (bad) return pHas(P.hates, v) ? `ugh, same! ${v} is the worst` : this.fresh([`${v}? yeah, i get that`, `ha, not a fan of ${v}? fair`, `${v}, huh? ok, noted!`]);
      const ts = topicsIn(v.split(' ')), sayT = ts.find(t => P.says && P.says[t]);
      if (pHas(P.likes, v) || sayT) return this.fresh([`me too!! ${v} is the best`, `no way, i love ${v} too!`]) + (sayT && chance(.6) ? ' ' + this.fresh(P.says[sayT]) : '');
      if (pHas(P.hates, v)) return `hmm, ${v} is not really my thing, but i'm glad you like it!`;
      return this.fresh([`you like ${v}? cool!`, `${v}! nice.`, `ooh, ${v}!`]) + ' ' + this.fresh(['what do you like about it?', 'how come?', 'tell me more!']);
    }
  }
  // questions to the bot
  if (/\bwhat are you doing\b|\bwhat you doing\b|\bwhat are you up to\b/.test(n)) return this.fresh(P.doing.length ? P.doing : ['just chatting with you!']);
  if (/\bhow (are|r) you\b|\bhow is it going\b|\bhow you doing\b|\bhow have you been\b|^what is up\b|\bhow about you\b|\bwhat about you\b/.test(n)) {
    this.lastQ = { t: 'mood', turn: this.turn };
    const g = /^(hi|hello|hey|hiya|heya|howdy|yo)\b/.test(n) ? this.fresh(['hey {me}! ', 'hi {me}! ']) : '';
    return g + this.fresh(['pretty good! how about you?', 'good! just hanging out online. you?', 'great, now that you are here! how are you?', 'not bad! ' + (this.fresh(P.doing) || '') + '. how are you?']);
  }
  if (/\byour (real|last|full) name\b/.test(n)) return `just ${this.name} online! internet rule: screen names only`;
  if ((r = this._self(x))) return { a: [r], noTypo: 1 };
  if (/\bhow old (are you|r you)\b|\bwhat is your age\b|\byour age\b/.test(n)) return this.fresh(P.bio.age);
  if (/\bwhere (do you live|are you from|are you|do you come from|you live|is your house)\b|\bwhat (state|city|town|country) (are you|do you)\b/.test(n)) return this.fresh(P.bio.where) + (chance(.35) ? ' ' + this.fresh(["(but shh, never tell people online where YOU live!)", '(remember, never share where you live online though!)']) : '');
  if (/\bwhat do you do\b|\bwhat is your job\b|\bdo you (work|have a job|go to school)\b|\bwhat grade are you\b|\bwhere do you work\b/.test(n)) return this.fresh(P.bio.job);
  if (/\byour (real|last|full) name\b/.test(n)) return `just ${this.name} online! internet rule: screen names only`;
  if (/\bwho are you\b|\bwhat is your name\b|\btell me about (yourself|you)\b|\bwho is this\b/.test(n)) return this.fresh(P.bio.who);
  if ((mm = n.match(/\b(?:what is|what are|do you have a|tell me) your (?:favorite|fav) ([a-z]+(?: show| game)?)\b|\byour (?:favorite|fav) ([a-z]+)\b/))) {
    const k = FAVK[mm[1] || mm[2]] || (mm[1] || mm[2]).split(' ')[0], mine = P.fav[k];
    if (!m.fav[k]) this.lastQ = { t: 'fav', k, turn: this.turn };
    return (mine ? `${mine}! ` : this.fresh(["hmm, i don't have one! ", "ooh, i can't pick just one! "])) + (m.fav[k] ? `and yours is ${m.fav[k].v}, right?` : "what's yours?");
  }
  if ((mm = n.match(/\bdo you (like|love|enjoy|play|watch|listen to|read|eat) (.{2,40})$/))) {
    const v = echo(mm[2].replace(/^(the|some|to)\s+/, ''), 30);
    if (v) {
      if (pHas(P.likes, v)) return this.fresh(['yes!! ', 'totally! ', 'are you kidding? yes! ']) + (this.fresh(P.says[topicsIn(v.split(' '))[0]] || []) || `${v} is the best`);
      if (pHas(P.hates, v)) return this.fresh(['not really lol', 'ugh, no. sorry!']);
      const ul = m.likes.find(q => q.v === v);
      if (ul) return `yeah! and ${this.src(ul.by, 'told me')} you like ${v} too!`;
      this.lastQ = { t: 'likeq', x: v, turn: this.turn };
      return this.fresh([`hmm, i've never tried ${v}. is it good?`, `${v}? maybe! do you like it?`]);
    }
  }
  if ((mm = n.match(/^(?:what is|what are|what does|do you know what|what s) (?:a |an |the )?([a-z0-9]+(?: [a-z0-9]+){0,2}?)(?: is| are| mean| means)?$/))) {
    const w = mm[1], d = l.defs[w];
    if (d) return `${this.src(d.by, 'taught me')}! ${w} ${/s$/.test(w) ? 'are' : 'is'} ${d.d}`;
    const k = KB.find(e => e[0] === w || e[0].replace(' ', '') === w.replace(' ', ''));
    if (k && k[1] <= this.year) return `${w}? ${k[2]}`;
    if ((w in ANACH && ANACH[w] > this.year) || !VOCAB.has(w)) { this.lastAsk = this.turn; this.st = { k: 'def', w }; return this.fresh([`${w}? i don't know! what is it?`, `hmm, no idea. you tell me! what's a ${w}?`]); }
  }
  if ((mm = n.match(/^can you ([a-z ]{2,30})$/))) return this.fresh(["i can type really fast. that's about it lol", "i'm a chat buddy, so mostly i can chat! and tell jokes. and play games", 'hmm, probably not. but i can tell a joke!']);
  if ((mm = n.match(/^have you (ever )?([a-z ]{2,30})$/))) return this.fresh(['hmm, not yet! have you?', 'nope! is it fun?', 'once! it was a long time ago lol']);
  // greetings & friends
  if (/^(hi|hello|hey|heya|hiya|howdy|yo|hola|greetings|good (morning|afternoon|evening))\b/.test(n)) {
    const extra = chance(.35) ? this._memLine() : '';
    return this.fresh(['hey {me}!', 'hi {me}!!', 'hiya!', 'hey hey', 'oh hi {me}!']) + (extra ? ' ' + extra : '');
  }
  if (/\b(brb|be right back|one sec|hold on)\b/.test(n)) return this.fresh(["ok! i'll be here", 'k!', 'take your time']);
  if (/\b(bye|goodbye|see you|got to go|have to go|talk to you later|good night|goodnight|gotta go|peace out|be back later)\b|^later\b/.test(n)) {
    const p = m.pets.find(q => q.n);
    return this.fresh(['bye {me}!', 'see you later!', 'bye! come back soon', 'talk to you later {me}!']) + (p && chance(.4) ? ` tell ${p.n} i said hi!` : '');
  }
  if (/\b(thank you|thanks)\b/.test(n)) return this.fresh(['no problem!', 'anytime!', "you're welcome!"]);
  if (P.confused && (r = this._curious(x, 0, 1))) return r;
  if (/^(lol|haha|hehe|rofl|hah|ha|lolol|hahaha|xd)+( |$)/.test(n) && x.len <= 3) return this.fresh(P_LAUGH(this.P).concat(['glad you think so', ':)']));
  if (/\b(sorry)\b/.test(n) && x.len <= 5) return this.fresh(["it's ok!", 'no worries!']);
  if (x.len <= 2 && YES.test(n)) return this.fresh(['cool', 'ok!', 'haha ok', 'nice']);
  if (x.len <= 2 && NO.test(n)) return this.fresh(['oh ok', 'aw ok', 'fair enough']);
  // curiosity and learned words
  if ((r = this._curious(x))) return r;
  for (const w in l.defs) if (w.length > 2 && (' ' + n + ' ').indexOf(' ' + w + ' ') >= 0 && !this.used['d:' + w] && chance(.5)) {
    this.used['d:' + w] = 1; const d = l.defs[w];
    return this.fresh([`oh, your ${w}! ${d.d}, right? ${this.src(d.by, 'taught me')} lol`, `a ${w}! i told ${this.other()} that a ${w} is ${d.d}. they didn't believe me`]);
  }
  return null;
};

const PET_RE = new RegExp('^(pet|pets|animal|animals|' + PET_KINDS + ')s?$');
B._recall = function (x) {
  const n = x.n, m = this.m;
  let mm;
  const from = by => (by && by !== this.name ? ' ' + this.src(by) + '!' : '');
  if (/\bwhat is my name\b|\bwho am i\b|\b(know|remember) my name\b|\bwhat do you call me\b/.test(n)) {
    const nm = m.nick || m.name;
    if (nm) return this.fresh([`duh, you're ${nm}!`, `${nm}! how could i forget?`]) + from(m.nameBy);
    this.lastQ = { t: 'nick', turn: this.turn };
    return this.fresh(['hmm, you never told me! what should i call you? just a first name or a nickname!', "you haven't told me yet! got a nickname i can call you?"]);
  }
  if (/^(do you )?remember me\b|\bwhat do you (know|remember) about me\b|\bdo you know (anything about )?me\b/.test(n)) return this._recap();
  if (/\bwhat (did|have) i (teach|taught|tell|told) you\b/.test(n)) {
    const L = this.l, bits = [];
    if (L.facts.length) bits.push('that ' + pick(L.facts).t);
    const dk = Object.keys(L.defs); if (dk.length) { const w = pick(dk); bits.push(`that ${w} means ${L.defs[w].d}`); }
    const j = L.jokes.find(q => q.q); if (j) bits.push(j.kk ? `a knock knock joke about ${j.q}` : `a joke: ${j.q} ${j.a}`);
    return bits.length ? 'you taught me ' + bits.slice(0, 2).join(', and ') + '!' : "nothing yet! teach me something. say \"remember that...\"";
  }
  if ((mm = n.match(/\b(?:what is|do you (?:know|remember)|remember|what was) my (?:favorite|fav) ([a-z]+(?: show| game)?)\b/))) {
    const k = FAVK[mm[1]] || mm[1].split(' ')[0], f = m.fav[k];
    if (f) return this.fresh([`${f.v}! of course i remember`, `duh, ${f.v}!`]) + from(f.by);
    this.lastQ = { t: 'fav', k, turn: this.turn }; return `hmm, you never told me your favorite ${k}! what is it?`;
  }
  mm = n.match(/\bwhat (?:is|was) my ([a-z]+(?: pig)?) name\b/) || n.match(/\bwhat (?:is|was) my ([a-z]+(?: pig)?)s name\b/) || n.match(/\b(?:do you )?(?:remember|know) (?:about |anything about )?my ([a-z]+(?: pig)?)\b/) || n.match(/\bwho is my ([a-z]+)\b/);
  if (!mm) return '';
  let w = mm[1].replace(/s$/, '') === 'pet' ? 'pet' : mm[1];
  if (/s$/.test(w) && !PET_RE.test(w) && PET_RE.test(w.slice(0, -1))) w = w.slice(0, -1);
  if (PET_RE.test(w)) {
    const kind = /^(pet|pets|animal|animals)$/.test(w) ? '' : w.replace(/s$/, '');
    const p = m.pets.find(q => q.n && (!kind || q.k === kind)) || m.pets.find(q => !kind || q.k === kind);
    if (p && p.n) return this.fresh([`duh, ${p.n} the ${p.k}!`, `of course! ${p.n} the ${p.k}!`]) + from(p.by) + ' ' + this.fresh([`how's ${p.n} doing?`, `did ${p.n} learn any new tricks?`, `give ${p.n} a pat for me!`]);
    if (p) { this.lastQ = { t: 'petname', k: p.k, turn: this.turn }; return `your ${p.k}! you never told me its name though. what is it?`; }
    this.lastQ = { t: 'pet', turn: this.turn }; return `hmm, you haven't told me about a ${kind || 'pet'} yet! do you have one?`;
  }
  if (/^(brother|sister|sibling|siblings|brothers|sisters)$/.test(w)) {
    const sb = m.sibs.find(q => !/^(brother|sister)$/.test(w) || q.r === w);
    if (sb) return this.fresh([`${sb.n}, your ${sb.r}!`, `duh, ${sb.n}!`]) + from(sb.by);
    this.lastQ = { t: 'sib', turn: this.turn }; return "you haven't told me about them yet! do you have any brothers or sisters?";
  }
  if (/^(hobby|hobbies)$/.test(w)) { const h = pick(m.hobbies); if (h) return `you like to ${h.v}!` + from(h.by); this.lastQ = { t: 'hobby', turn: this.turn }; return "you haven't told me! what do you like to do for fun?"; }
  if (/^(grade|class)$/.test(w)) { if (m.grade) return `${m.grade.v}${/grade|kinder|preschool|man|more|junior|senior/.test(m.grade.v) ? '' : ' grade'}!` + from(m.grade.by); return "you haven't told me! (you don't have to, either)"; }
  if (w === 'name') return this._recall({ n: 'what is my name', w: [] });
  const lk = m.likes.find(q => (' ' + q.v + ' ').indexOf(' ' + w) >= 0), f = this.l.facts.find(q => (' ' + q.t + ' ').indexOf(' ' + w) >= 0);
  if (lk) return `you like ${lk.v}!` + from(lk.by);
  if (f) return `you ${f.by && f.by !== this.name ? 'taught ' + (FRIEND_NAME[f.by] || f.by) : 'taught me'} that ${f.t}!`;
  const ew = echo(w, 20);
  return ew ? `hmm, you haven't told me about your ${ew} yet! tell me about it!` : '';
};
/* questions about the bot's own life */
const SELF_SYN = [[/^(band|bands|group|music group)$/, 'band'], [/^(job|jobs|work|company|business|startup|dot com|boss)$/, 'job'], [/^(pet|pets|dog|dogs|cat|cats|puppy|kitty|hamster|lizard|animal)$/, 'pet'],
  [/^(home|hometown|house|town|city|state|country|address)$/, 'home'], [/^(school|grade|class|teacher|high school)$/, 'school'], [/^age$/, 'age'],
  [/^(website|homepage|home page|page|site|web page|weblog|blog|web site)$/, 'site'], [/^(sister|sisters|brother|brothers|siblings|family|kids|children|grandkids|grandson|grandchildren|mom|dad|parents)$/, 'family'],
  [/^(car|ride)$/, 'car'], [/^(computer|modem|pc)$/, 'computer'], [/^(score|high score|record|high scores)$/, 'score'], [/^(instrument|guitar)$/, 'instrument'], [/^(name|screen name|screenname|username)$/, 'name']];
const selfKey = x => { for (const [re, k] of SELF_SYN) if (re.test(x)) return k; return ''; };
B._self = function (x) {
  const n = x.n, P = this.P;
  let X = '', have = false, mm;
  if (/\b(favorite|fav)\b/.test(n)) return '';
  if (/\bare you in a band\b|\bdo you play (in a band|an instrument|guitar|music)\b/.test(n)) X = /instrument|guitar/.test(n) ? 'instrument' : 'band';
  else if (/\bwhere do you (live|come from|stay)\b|\bwhere are you from\b|\bwhat (state|city|town|country) (do|are) you\b/.test(n)) X = 'home';
  else if (/\bwhere do you (go to school|study)\b|\bwhat grade are you\b|\bwhat school\b|\bdo you go to school\b/.test(n)) X = 'school';
  else if (/\bwhere do you work\b|\bwhat do you do for (work|a living|a job)\b|\bdo you (work|have a job)\b|\bwhat do you do\b/.test(n)) X = 'job';
  else if ((mm = n.match(/\b(?:what is|what are|tell me about|who is|how is|what was|whats) (?:the name of )?your ([a-z]+(?: [a-z]+)?)\b/))) X = mm[1];
  else if ((mm = n.match(/\bdo you (?:have|own|got) (?:a |an |any |your own )?([a-z]+(?: [a-z]+)?)\b/))) { X = mm[1]; have = true; }
  if (!X) return '';
  const ws = X.replace(/\b(called|named|name like|like|now|today)$/, '').trim();
  const key = selfKey(ws) || selfKey(ws.split(' ')[0]) || selfKey(ws.split(' ').pop()) || (X.split(' ').length > 1 && /(called|named)$/.test(X) ? selfKey(X.split(' ')[0]) : '');
  if (/^(doing|up to|day)$/.test(ws.split(' ')[0])) return '';
  if (key === 'age') return this.fresh(P.bio.age);
  if (key === 'home') return this.fresh(P.bio.where) + (chance(.35) ? ' ' + this.fresh(['(but shh, never tell people online where YOU live!)', '(remember, never share where you live online though!)']) : '');
  if (key === 'name') return this.fresh(P.bio.who);
  if (key === 'job') return (P.facts && P.facts.job) || this.fresh(P.bio.job);
  const F = P.facts || {};
  if (key && F[key]) return F[key];
  if (key === 'pet') { if (!this.m.pets.length) this.lastQ = { t: 'pet', turn: this.turn }; return 'no pets for me! ' + (this.m.pets.length ? `but i know you have ${this.m.pets[0].n || 'a ' + this.m.pets[0].k}!` : 'do you have any?'); }
  if (key === 'band') return "no band for me! i'd be the one playing the triangle lol. are you in a band?";
  if (key) return this.fresh(["hmm, that's kind of a boring story lol. what about you?", 'ha, nothing exciting there! what about yours?']);
  const e = echo(ws, 20);
  if (!e || NAME_STOP.has(e)) return '';
  return have ? this.fresh([`nope, no ${e} for me! do you have one?`, `a ${e}? i wish! do you have one?`]) : this.fresh([`my ${e}? ha, that's top secret lol. what about yours?`, `hmm, i don't really have a ${e}! do you?`]);
};

B._teach = function (t, dyk) {
  t = swapP(echo(t, 120).toLowerCase()).replace(/\?+$/, '').trim();
  if (t.length < 4 || scan(t).flagged || /\byou are (so |really )?(dumb|stupid|ugly|lame|mean|bad)/.test(t)) return 'hmm, ok!';
  const L = this.l.facts;
  if (!L.find(f => f.t === t)) L.push({ t, by: this.name, ts: now() });
  return dyk ? this.fresh([`no way! ${t}? i didn't know that! i'll remember it`, `whoa, really? ${t}! learned something new`]) : this.fresh([`ok! i'll remember that ${t}`, `got it! ${t}. saved in my brain`]);
};
B._recap = function () {
  const m = this.m, bits = [];
  if (m.nick || m.name) bits.push(`you're ${m.nick || m.name}`);
  const p = m.pets.find(q => q.n); if (p) bits.push(`you have a ${p.k} named ${p.n}`);
  const fk = Object.keys(m.fav); if (fk.length) { const k = pick(fk); bits.push(`your favorite ${k} is ${m.fav[k].v}`); }
  if (m.likes.length) bits.push(`you like ${pick(m.likes).v}`);
  if (this.l.facts.length) bits.push(`you taught me that ${pick(this.l.facts).t}`);
  if (!bits.length) return "hmm, not much yet! tell me about yourself. what's your favorite thing to do?";
  return 'let me think... ' + bits.slice(0, 3).join(', ') + '!';
};
B._memLine = function () {
  const m = this.m, c = [];
  const mf = this._moodFollow(); if (mf) c.push([5, mf]);
  const p = m.pets.filter(q => q.n && !this.used['p:' + q.n]);
  if (p.length) c.push([3, () => { const q = pick(p); this.used['p:' + q.n] = 1; return (q.by && q.by !== this.name ? `${this.src(q.by)} you have a ${q.k} named ${q.n}! ` : '') + this.fresh([`how's ${q.n}?`, `did ${q.n} learn any new tricks?`, `give ${q.n} a pat for me!`, `what is ${q.n} up to today?`]); }]);
  const lk = m.likes.filter(q => !this.used['l:' + q.v]);
  if (lk.length) c.push([2, () => { const q = pick(lk); this.used['l:' + q.v] = 1; return q.by && q.by !== this.name ? `${this.src(q.by)} you like ${q.v}!` : this.fresh([`i was just thinking about ${q.v}. you like that, right?`, `still into ${q.v}?`]); }]);
  const fk = Object.keys(m.fav).filter(k => !this.used['f:' + k]);
  if (fk.length) c.push([2, () => { const k = pick(fk), f = m.fav[k]; this.used['f:' + k] = 1; return (f.by && f.by !== this.name ? `${this.src(f.by)} your favorite ${k} is ${f.v}!` : `i still remember your favorite ${k} is ${f.v}!`); }]);
  return c.length ? wpick(c)() : '';
};
B._moodFollow = function () {
  const md = this.m.mood;
  if (!md || !md.v || md.fu || NEG_MOOD.indexOf(' ' + md.v + ' ') < 0) return '';
  const age = now() - (md.t || 0); if (age < 36e5 * 3 || age > 864e5 * 7) return '';
  const d0 = new Date(md.t), d1 = new Date(); const days = Math.round((new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()) - new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())) / 864e5);
  const when = days <= 0 ? 'earlier' : days === 1 ? 'yesterday' : 'the other day';
  const who = md.by && md.by !== this.name && !ALIAS_SAME[this.name] ? `${this.src(md.by)} you were ${md.v} ${when}` : `you said you were ${md.v} ${when}`;
  return () => { md.fu = 1; this.lastQ = { t: 'mood', turn: this.turn }; return `${who}. feeling better?`; };
};

B._fallback = function (x) {
  const P = this.P, n = x.n;
  for (const [re, lines] of this.cReplies) { try { if (re.test(x.low) && chance(.7)) return this.fresh(lines); } catch (e) { /* bad regex */ } }
  const ts = topicsIn(x.w), t = ts.find(k => P.says && P.says[k]);
  if (t && chance(.75)) return this.fresh(P.says[t]) + (chance(.4) ? ' ' + this.fresh(FOLLOW) : '');
  if (x.q) return this.fresh(['good question!', "hmm, i don't know!", 'no clue lol. what do you think?', 'ooh, tough one. what do you think?']);
  const gen = this.cGeneric.length ? this.cGeneric.concat(GENERIC) : GENERIC;
  const roll = rnd();
  if (roll < (P.v.short || .25)) return this.fresh(gen);
  if (roll < .6) { const q = this._askQ(); return this.fresh(gen) + ' ' + (q || this.fresh(FOLLOW)); }
  if (roll < .8) { const tp = this._topTopic(); if (tp) return this.fresh(gen) + ' ' + TOPIC_Q[tp]; }
  const own = Object.keys(P.says || {}); if (own.length && chance(.6)) return this.fresh(P.says[pick(own)]);
  return this.fresh(gen) + ' ' + this.fresh(FOLLOW);
};
B._askQ = function () {
  const m = this.m;
  const open = QS.filter(q => (q.t === 'fav' ? !m.fav[q.k] : q.t === 'pet' ? !m.pets.length : q.t === 'sib' ? !m.sibs.length : !m.hobbies.length) && !this.used['q:' + (q.k || q.t)]);
  if (!open.length) return '';
  const q = pick(open); this.used['q:' + (q.k || q.t)] = 1;
  this.lastQ = { t: q.t, k: q.k, turn: this.turn };
  return q.q;
};
B._topTopic = function () {
  const T = this.s.topics, ks = Object.keys(T).filter(k => TOPIC_Q[k] && !this.used['t:' + k]).sort((a, b) => T[b] - T[a]);
  const k = ks.length ? (chance(.7) ? ks[0] : pick(ks.slice(0, 3))) : ''; if (k) this.used['t:' + k] = 1; return k;
};

/* ---------- greet / idle ---------- */
B.greet = function () {
  try {
    this._load();
    const m = this.m, s = this.s, me = this.me_, c = [];
    const sameStats = ALIAS_SAME[this.name] && s.bots[ALIAS_SAME[this.name]];
    if (sameStats && sameStats.n && this.eraId >= '2000' && !this.used.cross) c.push([6, () => { this.used.cross = 1; return this.fresh(["{me}!!! dude, we've been buddies since the chat room days", "{me}! remember the chat room in '95? we go way back lol"]); }]);
    const mf = this._moodFollow(); if (mf) c.push([6, () => 'hi {me}! ' + mf()]);
    if (m.pets.some(p => p.n) || m.likes.length || Object.keys(m.fav).length) c.push([5, () => this.fresh(['hey {me}! ', 'hi {me}!! ', '{me}! ']) + this._memLine()]);
    if (me.n && me.last && now() - me.last > 864e5 * 2) c.push([2, () => this.fresh(['{me}! long time no see!', 'hey stranger! where have you been, {me}?'])]);
    if (me.n) c.push([2, () => this.fresh(['hey {me}! welcome back', 'hi again {me}!'])]);
    c.push([2, () => this.fresh(this.cHello.length ? this.cHello : ['hi {me}!', 'hey {me}!'])]);
    const t = wpick(c)() || 'hi {me}!';
    this._save();
    return this._say(t, { noMirror: 1 });
  } catch (e) { return this._say('hi!'); }
};
B.idle = function () {
  try {
    if (this.st || this.bot.away) return null;
    if (!chance(this.o.idleRate == null ? .3 : +this.o.idleRate)) return null;
    this._load();
    const P = this.P, l = this.l, c = [];
    const ml = () => this._memLine();
    if (this.m.pets.length || this.m.likes.length || Object.keys(this.m.fav).length || this.m.mood) c.push([4, ml]);
    const facts = l.facts.filter(f => !this.used['x:' + f.t]);
    if (facts.length) c.push([2, () => { const f = pick(facts); this.used['x:' + f.t] = 1; return this.fresh([`i keep thinking about what ${this.src(f.by, 'taught me')}: ${f.t}`, `fun fact: ${f.t}. ${this.src(f.by, 'taught me')}!`]); }]);
    const dk = Object.keys(l.defs).filter(w => !this.used['d:' + w]);
    if (dk.length) c.push([2, () => { const w = pick(dk); this.used['d:' + w] = 1; return this.fresh([`i told ${this.other()} what a ${w} is. they didn't believe me lol`, `how's your ${w}? i still think it's cool that a ${w} is ${l.defs[w].d}`]); }]);
    const lj = l.jokes.filter(j => !j.kk && j.q && j.a);
    if (lj.length) c.push([1, () => { const j = pick(lj); return `remember that joke? ${j.q} ${j.a} lol ${this.src(j.by, 'told me')} that one`; }]);
    c.push([2, () => { const q = this._askQ(); return q || ''; }]);
    c.push([2, () => { const t = this._topTopic(); return t ? TOPIC_Q[t] : ''; }]);
    c.push([3, () => this.fresh(this.cLines.concat(P.doing))]);
    c.push([1, () => { const J = this.fresh(JOKES); return `${J[0]} ... ${J[1]} lol`; }]);
    c.push([1, () => { this.lastQ = { t: 'offer', g: pick(['20q', 'trivia', 'wyr']), turn: this.turn }; return { '20q': 'want to play 20 questions?', trivia: 'want a trivia question?', wyr: 'want to play would you rather?' }[this.lastQ.g]; }]);
    let t = ''; for (let i = 0; i < 4 && !t; i++) t = wpick(c)();
    this._save();
    return t ? this._say(t) : null;
  } catch (e) { return null; }
};

/* ---------- room helper ---------- */
function pickResponder(text, bots) {
  try {
    const list = arr(bots).map(b => (typeof b === 'string' ? { n: b } : b)).filter(b => b && b.n);
    if (!list.length) return null;
    const avail = list.filter(b => !b.away).length ? list.filter(b => !b.away) : list;
    const low = str(text, 600).toLowerCase(), x = parse(text), ws = ' ' + x.n + ' ';
    for (const b of avail) if (low.indexOf(str(b.n).toLowerCase()) >= 0) return b.n;
    for (const b of avail) { const P = PERSONAS[b.n]; if (P && P.call.split(' ').some(a => ws.indexOf(' ' + a + ' ') >= 0)) return b.n; }
    const ts = topicsIn(x.w); let best = [], bs = 0;
    avail.forEach(b => {
      const P = PERSONAS[b.n]; if (!P) return;
      let sc = 0; ts.forEach(t => { if (has(P.topics, t)) sc += 2; if (P.says[t]) sc += 1; });
      x.w.forEach(w => { if (w.length > 2 && (has(P.likes, w) || has(P.likes, w.replace(/(ing|s)$/, '')))) sc += 1; });
      if (sc > bs) { bs = sc; best = [b.n]; } else if (sc === bs && sc > 0) best.push(b.n);
    });
    return best.length ? pick(best) : pick(avail).n;
  } catch (e) { return null; }
}
const has = (s, w) => (' ' + str(s) + ' ').indexOf(' ' + w + ' ') >= 0;

G.BuddyBrain = {
  create: o => new Brain(isObj(o) ? o : {}),
  filter, pickResponder, addWords,
  personas: PERSONAS,
  version: 1
};
})(typeof window !== 'undefined' ? window : this);
