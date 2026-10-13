const test = require("node:test");
const assert = require("node:assert/strict");
const { dueNotices, addDays, campaignFinished } = require("../window");

const open = { windowStart: "2026-07-02", windowEnd: "2026-11-30", confirmed: true, status: "pending", converted: false, sentKinds: [] };

test("14 days before open is a heads-up", () => {
  assert.deepEqual(dueNotices({ ...open, today: "2026-06-18" }), ["heads_up_14"]);
  assert.deepEqual(dueNotices({ ...open, today: "2026-06-17" }), []);
});

test("open day and mid-window send the open notice once", () => {
  assert.deepEqual(dueNotices({ ...open, today: "2026-07-02" }), ["open_day"]);
  assert.deepEqual(dueNotices({ ...open, today: "2026-08-01", sentKinds: ["open_day"] }), []);
});

test("14 days before the deadline nudges unless converted", () => {
  assert.ok(dueNotices({ ...open, today: "2026-11-16", sentKinds: ["open_day"] }).includes("deadline_14"));
  assert.deepEqual(dueNotices({ ...open, today: "2026-11-16", sentKinds: ["open_day"], converted: true }), []);
});

test("unconfirmed and unsubscribed reminders send nothing", () => {
  assert.deepEqual(dueNotices({ ...open, today: "2026-07-02", confirmed: false }), []);
  assert.deepEqual(dueNotices({ ...open, today: "2026-07-02", status: "unsubscribed" }), []);
});

test("a missing open date is not invented", () => {
  assert.deepEqual(dueNotices({ ...open, windowStart: null, today: "2026-10-13" }), []);
});

test("campaign closes the day after the deadline", () => {
  assert.equal(addDays("2026-11-30", -14), "2026-11-16");
  assert.equal(campaignFinished("2026-12-01", "2026-11-30"), true);
  assert.equal(campaignFinished("2026-11-30", "2026-11-30"), false);
});
