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
       <span class="hs-txt"><b class="hs-blink">ADVERTISE HERE!</b><span>${w >= 728 ? 'Your retro ad here, seen by retro fans and families' : 'Your retro-style ad, seen by retro fans'}</span></span>
       <span class="hs-btn">CLICK HERE!</span>`
    : `<span class="hs-txt"><b class="hs-blink">ADVERTISE HERE!</b><span>Retro ads only</span></span><span class="hs-btn">CLICK!</span>`
});
