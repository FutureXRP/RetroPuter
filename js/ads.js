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
