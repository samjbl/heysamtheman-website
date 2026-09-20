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

    /* kept for reference — not displayed on the site */
    reelViews   : 5900000,   // approximate — Insights only reports "5.9M"
    reached     : 3170246

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
})();
