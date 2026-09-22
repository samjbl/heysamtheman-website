/* ════════════════════════════════════════════════════════════════════
   THE ONLY PLACE TO EDIT THE INSTAGRAM NUMBERS.

   index.html and partner.html both read from this file, so the two
   pages can never drift apart.

   ── How to update ───────────────────────────────────────────────────
   Every number here is typed by hand. Nothing writes to this file.

     Instagram app → Professional dashboard → Insights → 90 days
     → copy the figures into `values` and `audience`
     → commit and push; pushing to main is the deploy

   Keep `period` honest: if you read a different window, say so. The
   tiles, the hero line and the audience charts all come from here, so
   one edit updates both pages at once.

   ── What these numbers are ──────────────────────────────────────────
   `values` is a ROLLING 90-DAY reading, straight off the dashboard.
   Instagram retains only 90 days and publishes no lifetime total, so
   that is the only views figure it will vouch for. Do not relabel it
   "all time" — the site did once, over a number that was itself a
   90-day reading, and the mislabel is what made it wrong.

   Source: Instagram app → Professional dashboard → Insights, 90 days,
   read 20 Sep 2026.
   ════════════════════════════════════════════════════════════════════ */

window.SAM_METRICS = {

  period : 'Last 90 days',

  values: {

    /* shown on index.html and partner.html */
    views       : 6279623,
    interactions: 449359,
    followers   : 9867,
    posts       : 181,

    /* kept for reference — not displayed as a tile */
    reelViews    : 6100000,  // Reels are 6.1M of the 6.28M
    reached      : 3282249,  // unique viewers
    profileVisits: 72729,
    netFollowers : 5872      // +147.0% over the window

  },

  /* The rounded, cross-platform line in the HERO — not the stat tiles.
     The tiles below print `values`, exact and Instagram-only. This is
     the marketing line at the top of the page, rounded DOWN so every
     figure is a floor: Instagram alone already clears 6M views and
     400K interactions over 90 days. Followers is the one number that
     leans on YouTube and Facebook, which have no figures in this file
     yet — Instagram on its own is 9,867. */
  hero: {
    views    : '6M+',
    likes    : '400K',
    followers: '10,000'
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
})();
