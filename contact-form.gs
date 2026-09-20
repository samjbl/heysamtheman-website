/**
 * heysamtheman.com — contact form backend
 * ---------------------------------------
 * Runs on Google Apps Script, under Sam's own Google account. No third
 * party, no signup, no API key. Mail arrives in the usual Gmail inbox and
 * Reply goes straight back to whoever filled the form in.
 *
 * DEPLOY (about two minutes, once):
 *   1. Go to script.google.com  ->  New project
 *   2. Delete whatever is in Code.gs and paste this whole file in
 *   3. Rename the project "heysamtheman contact form" (top left)
 *   4. Deploy  ->  New deployment  ->  gear icon  ->  Web app
 *        Description:  contact form
 *        Execute as:   Me (samuel.jeanblanc@gmail.com)
 *        Who has access: Anyone          <- must be "Anyone", not
 *                                           "Anyone with Google account"
 *   5. Deploy. Google asks you to authorise it once — Advanced ->
 *      Go to heysamtheman contact form (unsafe) -> Allow. It is your own
 *      script; the warning is what Google shows for every unpublished one.
 *   6. Copy the Web app URL. It ends in /exec.
 *   7. Paste it into index.html:   var FORM_ENDPOINT = 'https://.../exec';
 *
 * To change where mail lands later, edit TO below and redeploy
 * (Deploy -> Manage deployments -> pencil -> Version: New version).
 *
 * Quota: MailApp allows 100 recipients/day on a free account. Far more
 * than a contact form will ever use.
 */

var TO      = 'samuel.jeanblanc@gmail.com';
var SUBJECT = 'Website enquiry';

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    /* honeypot — bots fill hidden fields, people never see it.
       Answer success so the bot does not retry. */
    if (d.company_url) return json({ success: true });

    var name    = String(d.name    || '').trim();
    var email   = String(d.email   || '').trim();
    var company = String(d.company || '').trim();
    var message = String(d.message || '').trim();

    if (!name || !email || !message)             return json({ success: false, error: 'missing fields' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ success: false, error: 'invalid email' });

    if (name.length    > 120)  name    = name.slice(0, 120);
    if (company.length > 120)  company = company.slice(0, 120);
    if (message.length > 5000) message = message.slice(0, 5000);

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
        'Hit Reply to answer ' + name + ' directly.'
      ].join('\n')
    });

    return json({ success: true });

  } catch (err) {
    return json({ success: false, error: String(err) });
  }
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
