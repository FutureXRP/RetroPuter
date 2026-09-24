/* Blocked words for Buddy Brain's chat filter, stored ROT13-encoded so the source isn't a list of bad words.
   Exact words, word roots that match inside other words, and multi-word phrases. Extend as needed. */
(function () {
  if (!window.BuddyBrain || !window.BuddyBrain.addWords) return;
  var d = function (a) { return a.map(function (w) { return w.replace(/[a-z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97); }); }); };
  window.BuddyBrain.addWords(d(["phag", "shpx", "shpxvat", "shpxre", "shpxrq", "zbgureshpxre", "fuvg", "fuvggl", "ohyyfuvg", "ovgpu", "ovgpurf", "nffubyr", "nff", "onfgneq", "qnza", "tbqqnza", "qvpx", "qvpxurnq", "pbpx", "chffl", "gjng", "cevpx", "cvff", "cvffrq", "penc", "fyhg", "juber", "ubr", "cbea", "cbeab", "frk", "frkl", "ahqr", "ahqrf", "anxrq", "obbof", "gvgf", "gvggvrf", "cravf", "intvan", "qvyqb", "ubeal", "oybjwbo", "unaqwbo", "encr", "encvfg", "anmv", "ergneq", "ergneqrq", "snt", "snttbg", "qlxr", "avttre", "avttn", "fcvp", "puvax", "xvxr", "jrgonpx", "genaal", "xlf"]), { roots: d(["shpx", "fuvg", "avtt", "sntt", "jube", "qvyqb", "cbea"]), phrases: d(["xvyy lbhefrys", "tb qvr", "fhpx zl", "oybj wbo", "unaq wbo"]) });
})();
