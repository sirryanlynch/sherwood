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
