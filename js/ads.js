/* Ads for the desk view's banner slot (728x90, 468x60, 320x50). House rule: every ad must look and
   feel retro (1985-2000 style). See advertise.html for the full guidelines.
   Each ad: { id, href, label, newTab, html(w, h) } where html returns the banner's inner markup for
   that size. When several ads are listed, one is picked at random for each visit. */
window.RETRO_ADS = window.RETRO_ADS || [];
window.RETRO_ADS.push({
  id: 'house',
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
window.RETRO_SPONSOR = window.RETRO_SPONSOR || {
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
