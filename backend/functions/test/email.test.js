const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEmail, sendingConfig } = require("../email");
const { STATUTORY_DISCLOSURE } = require("../disclosure");

test("every email includes unsubscribe, postal address, and the statutory disclosure", () => {
  const mail = buildEmail({
    kind: "confirm",
    countyName: "Santa Cruz",
    windowStart: "2026-07-02",
    confirmUrl: "https://example.com/confirmReminder?token=abc",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.match(mail.text, /Unsubscribe: https:\/\/example.com\/unsubscribe\?token=def/);
  assert.match(mail.text, /1 Market St, San Francisco, CA 94105/);
  assert.equal(mail.text.includes("Sherwood is not a law firm"), false);
  assert.match(mail.text, /2026-07-02/);
  assert.equal(mail.text.startsWith(STATUTORY_DISCLOSURE), true);
  assert.ok(mail.html.indexOf("border:1px solid #c9d3de") < mail.html.indexOf("<h1"));
  assert.ok(mail.html.indexOf("padding:8px 16px") < mail.html.indexOf("<h1"));
  assert.ok(mail.html.indexOf("background:#f3f5f8") < mail.html.indexOf("<h1"));
  assert.ok(mail.html.indexOf("color:#3e556e") < mail.html.indexOf("<h1"));
  assert.ok(mail.html.indexOf("text-transform:none") < mail.html.indexOf("<h1"));
  assert.ok(mail.html.indexOf("font-weight:700") < mail.html.indexOf("<h1"));
  assert.ok(mail.html.indexOf('alt="Sherwood"') > mail.html.indexOf("border:1px solid #c9d3de"));
  assert.ok(mail.html.indexOf('alt="Sherwood"') < mail.html.indexOf("<h1"));
  assert.match(mail.html, /<img [^>]*src="https:\/\/sirryanlynch\.github\.io\/sherwood\/logo\.png"/);
  assert.match(mail.text, /Orders for us to file close Nov 25, 2026\./);
  assert.equal(mail.disclosurePx, 16);
  assert.equal(mail.headingPx, 15);
  assert.ok(mail.disclosurePx > mail.headingPx);
});

test("renewal email leads with the disclosure and a smaller heading", () => {
  const mail = buildEmail({
    kind: "renewal",
    countyName: "Santa Cruz",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    cancelUrl: "https://example.com/cancel?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.equal(mail.text.startsWith(STATUTORY_DISCLOSURE), true);
  assert.equal(mail.text.includes("Sherwood is not a law firm"), false);
  assert.match(mail.text, /Annual monitor renewal/);
  assert.match(mail.text, /15 to 45 days before the renewal date/);
  assert.match(mail.text, /Cancel online: https:\/\/example.com\/cancel/);
  assert.match(mail.html, /font-size:16px/);
  assert.match(mail.html, /font-size:15px/);
  assert.ok(mail.html.indexOf("font-size:16px") < mail.html.indexOf("font-size:15px"));
  assert.equal(mail.html.includes("font-size:20px"), false);
  assert.equal(mail.html.includes("font-size:18px"), false);
  assert.equal(mail.html.includes("font-size:34px"), false);
  assert.match(mail.text, /Orders for us to file close Nov 25, 2026\./);
});

test("monitor confirmation keeps the renewal terms and a cancel link", () => {
  const mail = buildEmail({
    kind: "monitor_confirm",
    unsubscribeUrl: "https://example.com/cancelMonitor?token=abc",
    cancelUrl: "https://example.com/cancelMonitor?token=abc",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.match(mail.text, /You agreed to the annual monitor at \$49 a year/);
  assert.match(mail.text, /15 to 45 days before the renewal/);
  assert.match(mail.text, /Cancel online: https:\/\/example.com\/cancelMonitor\?token=abc/);
  assert.match(mail.text, /This confirmation is yours to keep/);
});

test("deadline emails print the county date and do not hardcode a day count", () => {
  const fixed = buildEmail({
    kind: "deadline_14",
    countyName: "Santa Cruz",
    windowEnd: "2026-11-30",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.match(fixed.text, /County filing deadline: Nov 30, 2026/);
  assert.equal(/14 days/.test(fixed.text), false);
  assert.equal(/\d+ days left/.test(fixed.text), false);
  assert.equal(fixed.text.includes("About 14 days"), false);

  const counted = buildEmail({
    kind: "deadline_14",
    countyName: "Santa Cruz",
    windowEnd: "2026-11-30",
    today: "2026-10-13",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.match(counted.text, /County filing deadline: Nov 30, 2026/);
  assert.equal(/\(\d+ days left\)/.test(counted.text), false);
  assert.match(counted.text, /Orders for us to file close Nov 25, 2026\./);

  const heads = buildEmail({
    kind: "heads_up_14",
    countyName: "Santa Cruz",
    windowStart: "2026-07-02",
    windowEnd: "2026-11-30",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.match(heads.text, /opens Jul 2, 2026/);
  assert.match(heads.text, /County filing deadline: Nov 30, 2026/);
  assert.equal(heads.text.includes("About 14 days"), false);
  assert.equal(/\d+ days/.test(heads.text), false);
});

test("sending refuses to build without a postal address", () => {
  assert.throws(() => buildEmail({
    kind: "open_day",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "  "
  }), /MAIL_POSTAL_ADDRESS/);
});

test("unused provider keys do not count as configured", () => {
  const cfg = sendingConfig({
    MAIL_POSTAL_ADDRESS: "1 Market St",
    MAIL_FROM: "Sherwood <reminders@example.com>",
    PUBLIC_FUNCTIONS_BASE_URL: "https://example.com",
    RESEND_API_KEY: "unused"
  });
  assert.equal(cfg.ok, false);
  assert.ok(cfg.missing.includes("RESEND_API_KEY"));
});
