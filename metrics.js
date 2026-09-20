/* ════════════════════════════════════════════════════════════════════
   THE ONLY PLACE TO EDIT THE INSTAGRAM NUMBERS.

   index.html and partner.html both read from this file, so the two
   pages can never drift apart.

   ⚠️ `views` and `updated` are written automatically each morning by
   .github/workflows/instagram-views.yml. Do not hand-edit them — the
   next run overwrites whatever you type.

   ── Two different numbers, and why ──────────────────────────────────
   values.views  = ROLLING 90 DAYS, straight from Instagram. Verifiable.
                   This is what the stat tiles show.
   lifetime      = a FLOOR, not a total. Instagram publishes no lifetime
                   figure and retains only 90 days, so a true all-time
                   number does not exist anywhere. See lifetime.basis.

   The site used to print 6,024,602 under "All time". That was wrong —
   it was itself a 90-day reading. The current 90-day number is larger,
   which is what gave it away.

   Source: Instagram app → Professional dashboard → Insights, 90 days,
   read 20 Sep 2026.
   ════════════════════════════════════════════════════════════════════ */

window.SAM_METRICS = {

  period : 'Last 90 days',
  updated: '2026-09-20',

  values: {

    /* shown on index.html and partner.html */
    views       : 6279623,   /* AUTOMATED — see data/views-log.json */
    interactions: 449359,
    followers   : 9867,
    posts       : 181,

    /* kept for reference — not displayed as a tile */
    reelViews    : 6100000,  // Reels are 6.1M of the 6.28M
    reached      : 3282249,  // unique viewers
    profileVisits: 72729,
    netFollowers : 5872      // +147.0% over the window

  },

  /* Lifetime floor. Hand-maintained — the automation does not touch it.
     Add to `additions` when a pre-window post is worth counting, and
     raise `display` only when the rounding actually changes. */
  lifetime: {
    display  : '6.5M+',
    floor    : 6488623,
    additions: [
      { what: 'Mt. Fuji + Mt. Yotei ski descents', views: 200000, when: 'May 2026 / Feb 2026', note: "Sam's estimate, not a dashboard reading" },
      { what: 'Malapascua thresher shark',         views:   9000, when: 'pre-window',          note: "Sam's figure" }
    ],
    basis: '6,279,623 verified over the last 90 days, plus ~209,000 from posts that fall outside the 90-day window. A floor, not a ceiling.'
  },

  /* The headline number under the reels — best single Reel in the window. */
  topReel: 3200000,

  /* Audience dashboard on index.html. Percentages are NUMBERS, not
     strings — index.html draws the bars from them, so a change here
     changes the chart. Age stays in age order (an ordered scale reads
     wrong sorted by size); countries are ranked.
     Source: Instagram app → Professional dashboard → Insights, 90 days,
     read 20 Sep 2026.
     Held back deliberately, not rendered: 98.0% of views come from
     non-followers, and 13–17 is 0.6% of the audience. */
  audience: {
    gender: [
      { k:'Women', v:47.4 },
      { k:'Men',   v:52.6 }
    ],
    age: [
      { k:'18–24', v:7.0  },
      { k:'25–34', v:34.1 },
      { k:'35–44', v:34.1 },
      { k:'45–54', v:13.9 },
      { k:'55–64', v:6.9  },
      { k:'65+',   v:3.5  }
    ],
    countries: [
      { k:'United States',  v:11.2 },
      { k:'India',          v:9.3  },
      { k:'United Kingdom', v:8.5  },
      { k:'Philippines',    v:7.1  },
      { k:'Germany',        v:6.4  }
    ]
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
  /* string-valued metrics (the lifetime floor is deliberately not a
     formatted number — rounding IS the honesty here) */
  document.querySelectorAll('[data-metric-text]').forEach(function(el){
    var k = el.getAttribute('data-metric-text');
    if(k === 'lifetime' && M.lifetime && M.lifetime.display) el.textContent = M.lifetime.display;
  });
})();
