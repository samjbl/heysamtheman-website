/**
 * heysamtheman.com — contact form backend
 * ---------------------------------------
 * Runs on Google Apps Script, under Sam's own Google account. No third
 * party, no signup, no API key. Mail arrives in the usual Gmail inbox and
 * Reply goes straight back to whoever filled the form in.
 *
 * NOT PUBLISHED. This file lives in _private/ so GitHub Pages does not
 * serve it — it used to sit in the repo root and was readable at
 * heysamtheman.com/contact-form.gs, address and all.
 *
 * ── ABUSE CONTROLS (added 21 Sep 2026) ──────────────────────────────
 * The /exec endpoint is open to anyone — it has to be, the form is on a
 * static site with no server. Before, one honeypot field was the only
 * defence, so a loop against /exec could burn the 100-mail/day MailApp
 * quota in seconds and the contact channel would go dark silently.
 *
 * Four layers now, cheapest first:
 *   1. Honeypot        — hidden field; if filled, drop and fake success.
 *   2. Timing          — a form submitted under MIN_FILL_SECONDS after
 *                        page load is a script, not a person. Dropped
 *                        with a fake success so bots do not retry.
 *   3. De-duplication  — identical name+email+message inside
 *                        DUPE_WINDOW_MIN is sent once.
 *   4. Rate limits     — BURST_MAX per BURST_WINDOW_MIN, and DAILY_MAX
 *                        per day, script-wide. Past either, mail is
 *                        refused and the sender is told to email direct.
 *
 * With DAILY_MAX at 25 the quota can never be exhausted; 75 mails/day
 * stay free for everything else on the account. The first time a limit
 * is hit in a day, ONE alert goes to TO, so a flood looks like a flood
 * instead of silence.
 *
 * What this does NOT do: stop a determined attacker from filling the 25.
 * Nothing client-side can. For that, put Cloudflare Turnstile in front
 * and verify the token here — see SECURITY-REVIEW.md, item 2.
 *
 * DEPLOY (about two minutes, once):
 *   1. Go to script.google.com  ->  open "heysamtheman contact form"
 *   2. Delete what is in Code.gs and paste this whole file in
 *   3. Deploy -> Manage deployments -> pencil -> Version: New version
 *      -> Deploy.   The /exec URL does NOT change, so index.html needs
 *      no edit for a redeploy.
 *
 * First-time deploy instead of a redeploy:
 *   Deploy -> New deployment -> gear -> Web app
 *     Execute as:      Me (samuel.jeanblanc@gmail.com)
 *     Who has access:  Anyone       <- must be "Anyone", not
 *                                      "Anyone with Google account"
 *   Then paste the new /exec URL into index.html's FORM_ENDPOINT.
 *
 * To change where mail lands, edit TO below and redeploy.
 */

var TO      = 'samuel.jeanblanc@gmail.com';
var SUBJECT = 'Website enquiry';

/* ── tuning ──────────────────────────────────────────────────────────
   Raise DAILY_MAX only with the 100/day MailApp quota in mind: the cap
   exists so a flood cannot spend it all. */
var MIN_FILL_SECONDS  = 3;    // faster than this = script, not person
var MAX_FORM_AGE_HOURS= 12;   // a page open longer than this is stale
var BURST_MAX         = 3;    // mails per BURST_WINDOW_MIN, script-wide
var BURST_WINDOW_MIN  = 10;
var DAILY_MAX         = 25;   // mails per day, script-wide
var DUPE_WINDOW_MIN   = 60;   // identical submissions collapse

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    /* ── 1. honeypot ───────────────────────────────────────────────
       Bots fill hidden fields, people never see it. Answer success so
       the bot marks it done and does not retry. */
    if (d.company_url) return json({ success: true });

    /* ── 2. timing ─────────────────────────────────────────────────
       index.html stamps `ts` with Date.now() at page load. A submission
       arriving in under MIN_FILL_SECONDS was not typed by a human.
       A missing `ts` is NOT rejected — someone on a cached copy of the
       old page has none — it is just flagged in the mail body. The rate
       limits below are what actually holds the line. */
    var verified = false;
    if (d.ts) {
      var ageMs = Date.now() - Number(d.ts);
      if (!(ageMs >= 0)) return json({ success: true });                    // clock nonsense
      if (ageMs < MIN_FILL_SECONDS * 1000) return json({ success: true });  // too fast
      if (ageMs > MAX_FORM_AGE_HOURS * 3600 * 1000) return json({ success: true });
      verified = true;
    }

    var name    = String(d.name    || '').trim();
    var email   = String(d.email   || '').trim();
    var company = String(d.company || '').trim();
    var message = String(d.message || '').trim();

    if (!name || !email || !message)               return json({ success: false, error: 'missing fields' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ success: false, error: 'invalid email' });

    if (name.length    > 120)  name    = name.slice(0, 120);
    if (company.length > 120)  company = company.slice(0, 120);
    if (message.length > 5000) message = message.slice(0, 5000);

    /* ── 3 and 4 run under a lock ──────────────────────────────────
       Two requests a millisecond apart must not both read "24 sent
       today" and both send. Without the lock a parallel flood walks
       straight through the counters. */
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json({ success: false, error: 'busy' });

    try {
      var cache = CacheService.getScriptCache();

      /* 3. de-duplication — same person, same message, twice */
      var fingerprint = 'dupe_' + hash_(email + '|' + name + '|' + message);
      if (cache.get(fingerprint)) return json({ success: true });

      /* 4a. burst limit */
      var burst = Number(cache.get('burst') || 0);
      if (burst >= BURST_MAX) return refuse_('burst');

      /* 4b. daily limit */
      var props    = PropertiesService.getScriptProperties();
      var todayKey = 'sent_' + today_();
      var today    = Number(props.getProperty(todayKey) || 0);
      if (today >= DAILY_MAX) return refuse_('daily');

      MailApp.sendEmail({
        to      : TO,
        replyTo : email,
        name    : 'heysamtheman.com',
        subject : SUBJECT + (company ? ' · ' + company : '') + ' · ' + name,
        body    : [
          'Name:    ' + name,
          'Email:   ' + email,
          'Company: ' + (company || '—'),
          '',
          message,
          '',
          '—',
          'Sent from the contact form on heysamtheman.com',
          'Hit Reply to answer ' + name + ' directly.',
          verified ? '' : '(No form timestamp — sent from a cached page, or not through the form at all.)',
          '(' + (today + 1) + ' of ' + DAILY_MAX + ' today.)'
        ].join('\n')
      });

      /* only count what actually went out */
      cache.put(fingerprint, '1', DUPE_WINDOW_MIN * 60);
      cache.put('burst', String(burst + 1), BURST_WINDOW_MIN * 60);
      props.setProperty(todayKey, String(today + 1));
      cleanOldCounters_(props);

      return json({ success: true });

    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return json({ success: false, error: String(err) });
  }
}

/* Refuse, and alert Sam once a day so a flood is visible rather than
   silent. The alert itself is capped at one per day. */
function refuse_(which) {
  try {
    var props = PropertiesService.getScriptProperties();
    var key   = 'alerted_' + today_();
    if (!props.getProperty(key)) {
      props.setProperty(key, '1');
      MailApp.sendEmail({
        to      : TO,
        name    : 'heysamtheman.com',
        subject : 'Contact form hit its ' + which + ' limit',
        body    : [
          'The contact form on heysamtheman.com just refused a submission:',
          'it hit the ' + which + ' limit (' +
            (which === 'burst'
              ? BURST_MAX + ' per ' + BURST_WINDOW_MIN + ' minutes'
              : DAILY_MAX + ' per day') + ').',
          '',
          'If you were not expecting a rush of enquiries, someone is',
          'hammering the /exec endpoint. The cap means your MailApp quota',
          'is safe either way — but real enquiries are being turned away',
          'too, so it is worth looking at.',
          '',
          'Fix: put Cloudflare Turnstile in front of the form.',
          'See SECURITY-REVIEW.md, item 2.',
          '',
          'Only one of these per day, however many refusals there are.'
        ].join('\n')
      });
    }
  } catch (ignored) {}

  return json({ success: false, error: 'rate_limited' });
}

/* Keep ScriptProperties from growing without bound — it is a small
   store and this script writes one key per day. */
function cleanOldCounters_(props) {
  try {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 10);
    var all = props.getProperties();
    Object.keys(all).forEach(function(k) {
      var m = k.match(/^(?:sent|alerted)_(\d{4}-\d{2}-\d{2})$/);
      if (m && new Date(m[1]) < cutoff) props.deleteProperty(k);
    });
  } catch (ignored) {}
}

function today_() {
  return Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyy-MM-dd');
}

function hash_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s);
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/* lets you check it is alive by opening the /exec URL in a browser */
function doGet() {
  return json({ success: true, status: 'alive' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── Run this by hand from the editor to clear the day's counters ──
   Useful if you tripped the limit while testing. Select clearLimits in
   the function dropdown and press Run. */
function clearLimits() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('sent_' + today_());
  props.deleteProperty('alerted_' + today_());
  CacheService.getScriptCache().remove('burst');
  Logger.log('Cleared. Sent today: 0.');
}
