/* Ads for the desk view's banner slot (728x90, 468x60, 320x50). House rule: every ad must look and
   feel retro (1985-2000 style). See advertise.html for the full guidelines.
   Each ad: { id, href, label, newTab, html(w, h) } where html returns the banner's inner markup for
   that size. When several ads are listed, one is picked at random for each visit. */
window.RETRO_ADS = window.RETRO_ADS || [];
window.RETRO_ADS.push({
  id: 'house',
  active: false, // set to true (or delete this line) to put the "Advertise here" ad back in rotation
  href: 'advertise.html',
  label: 'Advertise on RetroPuter',
  newTab: false,
  html: (w, h) => w >= 468
    ? `<span class="hs-pc" aria-hidden="true"><i></i></span>
       <span class="hs-txt"><b class="hs-blink">ADVERTISE HERE!</b><span>${w >= 728 ? 'Your retro ad here, seen by retro fans!' : 'Your retro-style ad, seen by retro fans'}</span></span>
       <span class="hs-btn">CLICK HERE!</span>`
    : `<span class="hs-txt"><b class="hs-blink">ADVERTISE HERE!</b><span>Retro ads only</span></span><span class="hs-btn">CLICK!</span>`
});

/* Startup sponsor: a short "brought to you by" screen shown inside the monitor at the first boot of each
   visit (once per browser tab session), with a Skip button. 640x400 area, same retro rule.
   { id, href, label, newTab, seconds (2-6), html(era) }. Clicking it opens href; the boot continues. */
const HOUSE_SPONSOR = {
  id: 'house',
  href: 'advertise.html',
  label: 'Sponsor RetroPuter',
  newTab: false,
  seconds: 10,
  html: era => `<span class="hsp-top">This ${era.year} computer is brought to you by</span>
    <span class="hsp-logo">YOUR BRAND</span>
    <span class="hsp-sub">Sponsor the startup screen of RetroPuter!</span>
    <span class="hsp-btn">CLICK HERE TO FIND OUT HOW</span>`
};

/* ---- Pop Zero: a MADE-UP soda (not a real product) used as a sample advertiser. Its "website" is popzero.html. ---- */
const popCan = (h, cls) => `<svg class="${cls}" viewBox="0 0 22 40" width="${Math.round(h * 0.55)}" height="${h}" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="3" y="1" width="16" height="3" fill="#d0d0e0"/><rect x="2" y="3" width="18" height="35" fill="#5b1fd6"/>
  <rect x="2" y="3" width="4" height="35" fill="#7d4bff"/><rect x="17" y="3" width="3" height="35" fill="#3a0f94"/>
  <rect x="3" y="37" width="16" height="2" fill="#a0a0b8"/><rect x="2" y="12" width="18" height="12" fill="#00e5ff"/>
  <rect x="4" y="14" width="3" height="8" fill="#fff"/><rect x="7" y="14" width="2" height="2" fill="#fff"/><rect x="7" y="17" width="2" height="2" fill="#fff"/><rect x="4" y="16" width="5" height="1" fill="#fff"/>
  <rect x="11" y="14" width="6" height="2" fill="#ff2bd6"/><rect x="11" y="20" width="6" height="2" fill="#ff2bd6"/><rect x="11" y="14" width="2" height="8" fill="#ff2bd6"/><rect x="15" y="14" width="2" height="8" fill="#ff2bd6"/>
  <rect x="9" y="27" width="4" height="2" fill="#ffe600"/><rect x="8" y="29" width="4" height="2" fill="#ffe600"/><rect x="10" y="31" width="4" height="2" fill="#ffe600"/><rect x="9" y="33" width="3" height="2" fill="#ffe600"/>
</svg>`;
const popStars = n => `<span class="pz-stars">${'<i></i>'.repeat(n)}</span>`;
window.RETRO_ADS.push({
  id: 'popzero',
  href: 'popzero.html',
  label: 'Pop Zero soda',
  newTab: false,
  html: (w, h) => w >= 728
    ? `${popStars(8)}${popCan(72, 'pz-can')}<span class="pz-name"><b class="pz-logo">POP ZERO</b><b class="pz-tag">ZERO SUGAR. MEGA FIZZ!</b></span>
       <span class="pz-line"><b class="pz-blink">NEW!</b> Blue Razz</span><span class="pz-btn">GET FIZZY! &gt;&gt;</span>`
    : w >= 468
      ? `${popStars(6)}${popCan(50, 'pz-can')}<span class="pz-name"><b class="pz-logo">POP ZERO</b><b class="pz-tag">ZERO SUGAR. MEGA FIZZ!</b></span><span class="pz-btn">CLICK!</span>`
      : `${popStars(4)}${popCan(40, 'pz-can')}<span class="pz-name"><b class="pz-logo">POP ZERO</b><b class="pz-tag pz-blink">MEGA FIZZ!</b></span><span class="pz-btn">GO!</span>`
});

/* Startup sponsor currently running. Swap in HOUSE_SPONSOR to go back to the "Your brand here" screen. */
window.RETRO_SPONSOR = window.RETRO_SPONSOR || {
  id: 'popzero',
  href: 'popzero.html',
  label: 'Pop Zero soda',
  newTab: false,
  seconds: 10,
  html: era => `${popStars(14)}
    <span class="pzs-top">This ${era.year} computer is brought to you by</span>
    <span class="pzs-mid">${popCan(130, 'pzs-can')}<span class="pzs-name"><b class="pzs-logo">POP<br>ZERO</b><b class="pzs-tag">ZERO SUGAR. MEGA FIZZ!</b></span></span>
    <span class="pzs-line">${era.year < 1995 ? 'The official soda of late-night typing!' : era.year < 2000 ? 'Totally fizzy. Totally zero.' : 'The soda of the new millennium!'}</span>
    <span class="pzs-btn">CLICK FOR A FIZZY SURPRISE &gt;&gt;</span>`
};

/* ---- Desktop pop-up ads ----
   Shown on the desktop every 15-20 minutes of active use, for 15-30 seconds (timing lives in js/engine.js, POPAD).
   Each: { id, label, href, newTab, sample, html(era) }. `era` is { id, year }; make it look like that year.
   These are SAMPLE ads (made-up brands) until real advertisers are booked. Replace or add entries here. */
const pa = (cls, body) => `<div class="dpa-art ${cls}">${body}</div>`;
window.RETRO_POPUP_ADS = window.RETRO_POPUP_ADS || [
  { id: 'popzero', label: 'Pop Zero soda', href: 'popzero.html', newTab: false, sample: true,
    html: e => pa('dpa-pz', `${popStars(8)}${popCan(64, 'pz-can')}<div><b class="dpa-big">POP ZERO</b><span>Zero sugar. Mega fizz!</span><span class="dpa-btn">GET FIZZY &gt;&gt;</span></div>`) },
  { id: 'crunch', label: 'Cosmic Crunch cereal', href: 'advertise.html', newTab: false, sample: true,
    html: e => pa('dpa-cc', `<div class="dpa-bowl"><i></i><i></i><i></i><i></i><i></i></div><div><b class="dpa-big">COSMIC CRUNCH</b><span>Star-shaped crunch in every bite!</span><span class="dpa-btn">PART OF A COMPLETE BREAKFAST</span></div>`) },
  { id: 'zoom', label: 'Zoomers sneakers', href: 'advertise.html', newTab: false, sample: true,
    html: e => pa('dpa-zm', `<div class="dpa-shoe"></div><div><b class="dpa-big">ZOOMERS</b><span>Light-up sneakers. Run like lightning!</span><span class="dpa-btn">${e.year < 1995 ? 'AT A MALL NEAR YOU' : 'CLICK TO SEE ALL COLORS'}</span></div>`) },
  { id: 'pizza', label: 'MegaByte Pizza', href: 'advertise.html', newTab: false, sample: true,
    html: e => pa('dpa-mb', `<div class="dpa-pie"></div><div><b class="dpa-big">MEGABYTE PIZZA</b><span>${e.year >= 2000 ? 'Now order online! 30 minutes or it\'s free.' : 'Call 555-PIZZA. Hot to your door!'}</span><span class="dpa-btn">EXTRA CHEESE, NO EXTRA CHARGE</span></div>`) },
  { id: 'pals', label: 'Pixel Pals toys', href: 'advertise.html', newTab: false, sample: true,
    html: e => pa('dpa-pp', `<div class="dpa-pal"><i></i></div><div><b class="dpa-big">PIXEL PALS</b><span>The pocket pet that beeps when it's hungry!</span><span class="dpa-btn">COLLECT ALL 6!</span></div>`) },
  { id: 'arcade', label: 'Starlight Arcade', href: 'advertise.html', newTab: false, sample: true,
    html: e => pa('dpa-sa', `<div class="dpa-cab"></div><div><b class="dpa-big">STARLIGHT ARCADE</b><span>100 games. Free tokens every Tuesday!</span><span class="dpa-btn">SEE YOU AT THE MALL</span></div>`) }
];

/* Google AdSense (optional, OFF until you have an account). Fill in both values to show Google ads in the DESK
   BANNER spot (the ad above the computer). AdSense does not allow its ads in pop-ups, so the timed pop-ups
   above always use the list above. Also turn on "child-directed" treatment in your AdSense account. */
window.RETRO_ADSENSE = window.RETRO_ADSENSE || { client: '', slot: '' }; // e.g. client: 'ca-pub-1234567890123456', slot: '1234567890'
