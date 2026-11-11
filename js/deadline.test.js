import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { caseEmailDraft } from "./caseMail.js";
import { deadlineReminderPlan, cutoffSubject, borderlineReviewLine } from "./deadlineReminders.js";
import { paymentsAdapter } from "./adapters/payments.js";
import { loadDemoCase } from "./demo.js";
import { enrollMonitor, startIncludedYear } from "./monitor.js";

const memory = new Map();
const sessionMemory = new Map();
function memoryStore(map) {
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); }
  };
}
if (!globalThis.localStorage) globalThis.localStorage = memoryStore(memory);
if (!globalThis.sessionStorage) globalThis.sessionStorage = memoryStore(sessionMemory);

const county = JSON.parse(readFileSync(new URL("../data/counties/santa_cruz.json", import.meta.url), "utf8"));

test("deadline reminders use both dates and never call Nov 25 the county deadline", () => {
  const rows = deadlineReminderPlan(county);
  assert.equal(rows.length, 6);
  const cutoff = rows.filter(row => row.anchor === "order_cutoff");
  const window = rows.filter(row => row.anchor === "county_window");
  assert.deepEqual(cutoff.map(row => row.days), [14, 7, 2]);
  assert.deepEqual(cutoff.map(row => row.sendOn), ["2026-11-11", "2026-11-18", "2026-11-23"]);
  assert.deepEqual(window.map(row => row.sendOn), ["2026-11-16", "2026-11-23", "2026-11-28"]);
  assert.equal(cutoffSubject(county), "Our filing cutoff is Nov 25.");
  for (const row of cutoff) {
    assert.equal(row.subject, "Our filing cutoff is Nov 25.");
    assert.match(row.body, /County filing deadline: Nov 30, 2026/);
    assert.equal(row.body.includes("County filing deadline: Nov 25"), false);
    assert.match(row.body, /unsubscribe\.html\?token=/);
  }
  for (const row of window) {
    assert.equal(row.subject, "County filing deadline: Nov 30, 2026");
    assert.match(row.body, /not the county filing deadline/);
    assert.equal(row.subject.includes("Nov 25"), false);
  }
});

test("borderline review copy switches on Nov 21", () => {
  assert.equal(borderlineReviewLine(new Date(2026, 10, 20)), "You'll get an email within 2 business days.");
  assert.equal(borderlineReviewLine(new Date(2026, 10, 21)), "You'll hear from us before Nov 25, or we'll tell you we can't take it this season.");
});

test("a $0 card check can pass or fail without charging", async () => {
  const saved = await paymentsAdapter.saveCard({ userId: "u", matterId: "m", plan: { id: "dfy" } });
  const ok = await paymentsAdapter.revalidateCard({ userId: "u", matterId: "m", setupIntentId: saved.id });
  assert.equal(ok.amount, 0);
  assert.equal(ok.status, "succeeded");
  const failed = await paymentsAdapter.revalidateCard({ userId: "u", matterId: "m", setupIntentId: saved.id, fail: true });
  assert.equal(failed.status, "failed");
  assert.equal(failed.amount, 0);
});

test("the free monitor year starts at capture, not at card save", () => {
  const record = enrollMonitor({ email: "a@b.co", matterId: "m", includedWithFiling: true });
  assert.equal(record.status, "pending_capture");
  assert.equal(record.renewsOn, null);
  assert.equal(record.yearStartedAt, null);
  startIncludedYear(record, "2026-11-20T00:00:00.000Z");
  assert.equal(record.yearStartedAt, "2026-11-20T00:00:00.000Z");
  assert.equal(record.renewsOn, "2027-11-20");
  assert.equal(record.status, "active");
});

test("a reviewer demo seeds a Santa Cruz case", () => {
  const matter = loadDemoCase();
  assert.equal(matter.countyId, "santa_cruz");
  assert.equal(matter.outcome, "go");
  assert.equal(matter.planId, "dfy");
  assert.match(matter.kit.statement, /Simulated/);
});

test("customer copy drops the decline-after-intake refund and splits the two dates", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.equal(read("pricing.html").includes("If we decline to file after intake, full refund"), false);
  assert.match(read("pricing.html"), /declining before that means you pay nothing/);
  assert.equal(read("js/pages/results.js").includes("If we decide not to file after intake, you pay nothing"), false);
  assert.match(read("index.html"), /If you have a case, we prepare and file it for \$249, county fee included/);
  assert.match(read("index.html"), /County filing deadline: Nov 30/);
  assert.match(read("index.html"), /Our order cutoff: Nov 25/);
  assert.equal(read("index.html").includes("One Santa Cruz home, filed October 12, 2026"), false);
  assert.match(read("santa-cruz/index.html"), /Have your Santa Cruz County appeal filed\. Orders close Nov 25\./);
  assert.match(read("santa-cruz/index.html"), /county filing deadline is Nov 30/);
  assert.match(read("js/pages/checkout.js"), /name="cardConsent"/);
  const filed = caseEmailDraft("filed", { address: "1 Main", filing: { id: "file_1" } }, { county: "Santa Cruz" });
  assert.match(filed.body, /\[postal address pending\]/);
  assert.match(filed.body, /Disclosures: https:\/\/sirryanlynch\.github\.io\/sherwood\/disclosures\//);
  assert.match(read("js/pages/results.js"), /Email me reminders/);
});
