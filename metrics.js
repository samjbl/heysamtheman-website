/* ════════════════════════════════════════════════════════════════════
   THE ONLY PLACE TO EDIT THE INSTAGRAM NUMBERS.

   index.html and partner.html both read from this file, so the two
   pages can never drift apart. To refresh:

     Instagram app → Professional dashboard → Insights
     → set the date range to ALL TIME
     → copy the figures into `values` below
     → update `updated`

   Anything with a data-metric="…" attribute in the HTML is filled in
   from here at load. The numbers written inline in the HTML are only a
   fallback for browsers with JavaScript disabled.
   ════════════════════════════════════════════════════════════════════ */

window.SAM_METRICS = {

  period : 'All time',
  updated: '2026-09-20',

  values: {

    /* shown on index.html and partner.html */
    views       : 6024602,
    interactions: 435836,
    followers   : 9826,
    posts       : 181,

    /* kept for reference — not displayed as a tile */
    reelViews   : 5900000,   // approximate — Insights only reports "5.9M"
    reached     : 3170246

  },

  /* The headline number under the reels. Set topReel if you have a single
     reel's view count; otherwise this falls back to total views. */
  topReel: null,

  /* Audience block. Leave a field as '' and its row is hidden.
     Instagram app -> Professional dashboard -> Insights -> Total followers:
       locations = "Top locations" (top 3 countries)
       age       = "Age range" (the two biggest bands) */
  audience: {
    split    : 'Women 47.3% \u00b7 Men 52.7%',
    discovery: '98.7% of views come from people who don\u2019t follow me',
    locations: '',
    age      : ''
  }

};

(function(){
  var M = window.SAM_METRICS;
  if(!M || !M.values) return;
  var fmt = function(n){
    try { return n.toLocaleString('en-US'); } catch(e){ return String(n); }
  };
  document.querySelectorAll('[data-metric]').forEach(function(el){
    var k = el.getAttribute('data-metric'), v = M.values[k];
    if(v === undefined || v === null) return;
    el.setAttribute('data-to', v);      /* keeps the count-up animation honest */
    el.textContent = fmt(v);
  });
  document.querySelectorAll('[data-metric-period]').forEach(function(el){
    if(M.period) el.textContent = M.period;
  });
  document.querySelectorAll('[data-metric-top]').forEach(function(el){
    el.textContent = fmt(M.topReel || M.values.views);
  });
  var A = M.audience || {};
  document.querySelectorAll('[data-aud]').forEach(function(el){
    var v = A[el.getAttribute('data-aud')];
    if(v){ el.textContent = v; }
    else { var row = el.closest('.aud__i'); if(row) row.hidden = true; }
  });
})();
