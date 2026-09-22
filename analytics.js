/* ════════════════════════════════════════════════════════════════════
   analytics.js — sponsorship-intent events for Umami.

   The Umami tag in <head> already counts pageviews, referrers and
   countries on its own. This file adds the events that actually matter
   for winning brand deals, i.e. intent, not traffic:

     partner-cta     someone opened the partner page, and FROM WHERE.
                     This is the funnel: which expedition story sends
                     the most people to the sponsorship pitch.
     contact-email   clicked the hey@heysamtheman.com address.
     contact-submit  the contact form actually sent (fires once the
                     form endpoint is connected — see open issue 2).
     instagram-out   left the site for @hey_samtheman.
     outbound        left for any other external site, by domain.
     read-complete   reached the end of a field note. Tells you which
                     stories hold attention, not just which get opened.

   No cookies, no localStorage, no IDs. Nothing here identifies anyone,
   which is what keeps the site inside CNIL's consent exemption.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Where events go ─────────────────────────────────────────────
     TWO destinations, on purpose.

     Umami gets everything and is what Sam looks at. But Umami Cloud's
     free plan has no API key — that is a Pro feature — so nothing there
     can be read back programmatically. The Apps Script endpoint below
     is the second copy, landing in a Google Sheet in Sam's own Drive,
     which Claude CAN read, so the intent events reach the Field Report.

     Paste the /exec URL and the key from _private/site-events.gs here.
     Left blank, the beacon is simply skipped and Umami still works. */
  var EVENTS_ENDPOINT = '';
  var EVENTS_KEY      = '';

  /* Umami loads with `defer`, so it may not be ready when this runs.
     Every call is guarded — a missing or ad-blocked tracker must never
     throw into the page and break a link. */
  function toUmami(name, data) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(name, data || {});
      }
    } catch (e) { /* analytics must never break the site */ }
  }

  /* Fire-and-forget POST to the Sheet.

     keepalive:true is the important part — these events fire on clicks
     that navigate away, and without it the browser cancels the request
     as the page unloads and the event is lost. With it, the browser
     finishes the send in the background after the page is gone.

     mode:'no-cors' because we never read the reply; that also avoids a
     CORS preflight, as does the text/plain content-type, which Apps
     Script rejects a JSON preflight for (same trick as contact-form.gs).

     Nothing is awaited, so this cannot delay the navigation the user
     just triggered. */
  function toSheet(name, data) {
    if (!EVENTS_ENDPOINT) return;
    try {
      fetch(EVENTS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          k: EVENTS_KEY,
          e: name,
          d: data || {},
          r: document.referrer || ''
        })
      }).catch(function () { /* offline, blocked, quota — never surface */ });
    } catch (e) { /* analytics must never break the site */ }
  }

  function track(name, data) {
    toUmami(name, data);
    toSheet(name, data);
  }

  /* "/" and "/index.html" are the same page; normalise so the reports
     don't split one page across two rows. */
  var page = (function () {
    var p = location.pathname;
    if (p === '' || p === '/' || p.slice(-1) === '/') return 'index.html';
    return p.slice(p.lastIndexOf('/') + 1);
  })();

  var isFieldNote = page.indexOf('blog-') === 0;

  /* ── Clicks ──────────────────────────────────────────────────────
     One delegated listener rather than attributes on ~40 anchors.
     Survives markup changes and touches no existing HTML. Capture
     phase so it still fires if something calls stopPropagation. */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;

    var href = a.getAttribute('href') || '';

    if (href.indexOf('mailto:') === 0) {
      track('contact-email', { from: page });
      return;
    }

    /* Ignore in-page anchors and the SVG sprite's href="#i-..." refs. */
    if (href.charAt(0) === '#') return;

    if (href.indexOf('partner.html') !== -1) {
      track('partner-cta', { from: page });
      return;
    }

    var host;
    try { host = new URL(a.href, location.href).hostname; } catch (e) { return; }
    if (!host || host === location.hostname) return;      /* internal */

    if (host.indexOf('instagram.com') !== -1) {
      track('instagram-out', { from: page });
    } else {
      track('outbound', { domain: host.replace(/^www\./, ''), from: page });
    }
  }, true);

  /* ── Contact form ────────────────────────────────────────────────
     The form is disabled until an endpoint is connected. Listening now
     means the event starts arriving the day that lands, with no second
     edit. `submit` only fires when validation passed. */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function () {
      track('contact-submit', { from: page });
    });
  }

  /* ── Read completion on field notes ──────────────────────────────
     Observe the footer rather than measuring scroll percentage.
     Percent-of-height is fragile here: blog.css sets
     scroll-behavior:smooth, and sticky elements make scrollHeight
     disagree with the real maximum scroll position, so a "90%"
     threshold can silently never fire. The footer coming into view is
     unambiguous and needs no arithmetic.

     scrollY > 0 is required so an instant bounce on a short page is
     not counted as a read. Fires once, then disconnects. */
  if (isFieldNote && 'IntersectionObserver' in window) {
    var end = document.querySelector('footer.foot') ||
              document.querySelector('footer');
    if (end) {
      var seen = false;
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!seen && entries[i].isIntersecting && (window.scrollY || 0) > 0) {
            seen = true;
            track('read-complete', { post: page });
            io.disconnect();
          }
        }
      }, { threshold: 0.1 });
      io.observe(end);
    }
  }
})();
