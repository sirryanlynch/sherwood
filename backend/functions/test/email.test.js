const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEmail, sendingConfig } = require("../email");

test("every email includes unsubscribe, postal address, and the not-legal-advice line", () => {
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
  assert.match(mail.text, /not legal advice/);
  assert.match(mail.text, /2026-07-02/);
  assert.equal(mail.text.startsWith("Sherwood is not a law firm and this email is not legal advice."), true);
  assert.ok(mail.html.indexOf("not legal advice") < mail.html.indexOf("<h1"));
  assert.equal(mail.disclosurePx, 34);
  assert.equal(mail.headingPx, 20);
  assert.ok(mail.disclosurePx - mail.headingPx >= 12);
});

test("renewal email leads with the disclosure and a smaller heading", () => {
  const mail = buildEmail({
    kind: "renewal",
    countyName: "Santa Cruz",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  });
  assert.equal(mail.text.startsWith("Sherwood is not a law firm and this email is not legal advice."), true);
  assert.match(mail.text, /Annual monitor renewal/);
  assert.match(mail.html, /font-size:34px/);
  assert.match(mail.html, /font-size:20px/);
  assert.ok(mail.html.indexOf("font-size:34px") < mail.html.indexOf("font-size:20px"));
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
