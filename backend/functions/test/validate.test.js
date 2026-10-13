const test = require("node:test");
const assert = require("node:assert/strict");
const { validateReminderInput, validateLeadInput, validateMonitorInput, nextRate } = require("../validate");

test("reminder requires marketing consent, email, and source", () => {
  const bad = validateReminderInput({ email: "not-an-email", marketing_consent: false, consent_source: "" });
  assert.equal(bad.ok, false);
  const good = validateReminderInput({
    email: "Lead@Example.com",
    county_slug: "santa-cruz",
    address: "100 Main St",
    marketing_consent: true,
    consent_source: "results_off_season"
  });
  assert.equal(good.ok, true);
  assert.equal(good.value.email, "lead@example.com");
  assert.equal(good.value.marketing_consent, true);
});

test("rejects a long address and a bad slug", () => {
  const bad = validateReminderInput({
    email: "a@b.co",
    county_slug: "Santa Cruz!",
    address: "x".repeat(400),
    marketing_consent: true,
    consent_source: "non_launch_home"
  });
  assert.equal(bad.ok, false);
});

test("src and utm travel with the county slug", () => {
  const reminder = validateReminderInput({
    email: "a@b.co",
    county_slug: "santa-cruz",
    marketing_consent: true,
    consent_source: "non_launch_home",
    src: "mail1",
    utm: { utm_source: "letter", county: "ignored" }
  });
  assert.equal(reminder.ok, true);
  assert.equal(reminder.value.county_slug, "santa-cruz");
  assert.equal(reminder.value.src, "mail1");
  assert.deepEqual(reminder.value.utm, { utm_source: "letter" });
});

test("lead accepts a result without marketing consent", () => {
  const lead = validateLeadInput({ email: "a@b.co", outcome: "go", county_slug: "santa-cruz", consent_source: "results_save" });
  assert.equal(lead.ok, true);
  assert.equal(lead.value.outcome, "go");
});

test("monitor consent is required", () => {
  const missing = validateMonitorInput({ email: "a@b.co", renewal_consent: false });
  assert.equal(missing.ok, false);
  const good = validateMonitorInput({ email: "A@B.co", renewal_consent: true });
  assert.equal(good.ok, true);
  assert.equal(good.value.email, "a@b.co");
  assert.equal(good.value.renewal_consent, true);
});

test("rate limit allows eight per hour and then blocks", () => {
  let state = { count: 0, windowStartMs: 0 };
  for (let i = 0; i < 8; i++) {
    state = nextRate({ ...state, now: 1_000 });
    assert.equal(state.allow, true);
  }
  const blocked = nextRate({ ...state, now: 1_000 });
  assert.equal(blocked.allow, false);
  const later = nextRate({ ...blocked, now: 1_000 + 60 * 60 * 1000 });
  assert.equal(later.allow, true);
  assert.equal(later.count, 1);
});
