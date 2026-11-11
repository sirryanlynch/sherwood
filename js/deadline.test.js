import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { customerLine } from "./format.js";
import { decide } from "./engine.js";
import { caseEmailDraft } from "./caseMail.js";
import { deadlineReminderPlan, cutoffSubject, borderlineReviewLine } from "./deadlineReminders.js";
import { paymentsAdapter } from "./adapters/payments.js";
import { loadDemoCase } from "./demo.js";
import { MONITOR_TERMS, confirmationBody, enrollMonitor, startIncludedYear } from "./monitor.js";
import { MONITOR } from "./pricing.js";
import { countyDetailsLabel } from "./counties.js";

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
  const record = enrollMonitor({ email: "a@b.co", matterId: "m", includedWithFiling: true, renewal: true });
  assert.equal(record.status, "pending_capture");
  assert.equal(record.renewsOn, null);
  assert.equal(record.yearStartedAt, null);
  startIncludedYear(record, "2026-11-20T00:00:00.000Z");
  assert.equal(record.yearStartedAt, "2026-11-20T00:00:00.000Z");
  assert.equal(record.renewsOn, "2027-11-20");
  assert.equal(record.status, "active");
});

test("a filing includes the first monitor year when renewal is unchecked", () => {
  const record = enrollMonitor({ email: "a@b.co", matterId: "m", includedWithFiling: true, renewal: false });
  assert.equal(record.includedWithFiling, true);
  assert.equal(record.renewal, false);
  assert.equal(record.status, "pending_capture");
  startIncludedYear(record, "2026-11-20T00:00:00.000Z");
  assert.equal(record.yearStartedAt, "2026-11-20T00:00:00.000Z");
  assert.equal(record.renewsOn, null);
  assert.equal(record.status, "active");
  const checkout = readFileSync(new URL("./pages/checkout.js", import.meta.url), "utf8");
  assert.match(checkout, /Your first year of monitoring is included\. It starts when your filing is charged\. A declined or never-filed case doesn't get it\./);
  assert.match(checkout, /Renew monitoring at \$\{esc\(monitorPrice\)\}\/yr after that\.<\/label>/);
  assert.equal(/Renew monitoring at[^<]*Cancel anytime/.test(checkout), false);
  assert.match(checkout, /If you turn on renewal: \$\{esc\(MONITOR_TERMS\)\}/);
  const labelAt = checkout.indexOf("Renew monitoring at");
  const termsAt = checkout.indexOf("If you turn on renewal:");
  assert.ok(labelAt > 0 && termsAt > labelAt);
  assert.match(MONITOR_TERMS, new RegExp(`\\$${MONITOR.price}\\b`));
  assert.match(MONITOR_TERMS, /renews automatically each year until you cancel/);
  assert.match(MONITOR_TERMS, /cancel online in one click before the renewal date/);
  assert.match(MONITOR_TERMS, /15 to 45 days before the renewal/);
  const off = confirmationBody({ cancelToken: "t", includedWithFiling: true, renewal: false });
  assert.match(off, /Renewal is off\. Your monitoring ends after the first year with no charge\./);
  assert.equal(off.includes(MONITOR_TERMS), false);
  const on = confirmationBody({ cancelToken: "t", includedWithFiling: true, renewal: true });
  assert.ok(on.includes(MONITOR_TERMS));
  assert.match(on, new RegExp(`renews at \\$${MONITOR.price} a year`));
  const monitorSrc = readFileSync(new URL("./monitor.js", import.meta.url), "utf8");
  assert.equal(monitorSrc.includes("$49"), false);
  assert.match(checkout, /plainDollars\(MONITOR\.price\)/);
  assert.equal(checkout.includes('name="monitorRenewal" required'), false);
  assert.equal(checkout.includes('get("monitorRenewal") !== "on"'), false);
  assert.match(checkout, /We verify the card with a \$0 check and charge /);
  assert.match(checkout, /plainDollars\(dfyServiceAmount\(\)\)/);
});

test("likely savings sit strictly between low and high", () => {
  const decision = decide({
    county,
    today: new Date(2026, 9, 13),
    assessed: 1233915,
    market: 1075000,
    tax: 15000,
    confidence: "sure"
  });
  assert.ok(decision.savings.low < decision.savings.mid);
  assert.ok(decision.savings.mid < decision.savings.high);
  assert.notEqual(decision.savings.mid, decision.savings.high);
});

test("a no-action result does not show negative savings", () => {
  const decision = decide({
    county,
    today: new Date(2026, 9, 13),
    assessed: 800000,
    market: 850000,
    tax: 9000,
    confidence: "sure"
  });
  assert.equal(decision.outcome, "no_go");
  assert.equal(decision.savings.amount, null);
  assert.equal(decision.savings.low, null);
  assert.equal(decision.savings.mid, null);
  assert.equal(decision.savings.high, null);
  assert.equal(decision.savings.note, "No savings estimate, because your market value isn't below your assessed value.");
  assert.equal(String(decision.savings.note).includes("$"), false);
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

function visibleCopy(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function customerPages() {
  const pages = [];
  const walk = (dirUrl, prefix) => {
    for (const name of readdirSync(dirUrl, { withFileTypes: true })) {
      if (name.isDirectory()) {
        if (name.name === "docs" || name.name === "node_modules" || name.name === "backend") continue;
        walk(new URL(`${name.name}/`, dirUrl), `${prefix}${name.name}/`);
      } else if (name.name.endsWith(".html") && name.name !== "case-study.html" && name.name !== "admin.html") {
        pages.push(`${prefix}${name.name}`);
      }
    }
  };
  walk(new URL("../", import.meta.url), "");
  return pages;
}

test("customer pages do not mention the pilot filing or October 12", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const banned = /\bpilot\b|pilot result|october 12|oct\.?\s*12/i;
  const pages = customerPages();
  assert.ok(pages.includes("faq.html"));
  assert.ok(pages.includes("index.html"));
  for (const page of pages) {
    const html = read(page);
    assert.equal(banned.test(html), false, page);
    assert.equal(banned.test(visibleCopy(html)), false, `${page} visible`);
  }
  for (const sheet of ["style.css", "marketing.css"]) {
    assert.equal(/pilot result/i.test(read(sheet)), false, sheet);
  }
  assert.equal(read("index.html").includes("pilot result"), false);
  assert.equal(read("index.html").includes("not the pilot"), false);
  assert.match(read("js/boot.js"), /We file through the county's e-file portal\./);
  assert.match(read("js/boot.js"), /County e-file fee: included in the We file it price/);
  assert.match(read("js/boot.js"), /not yet confirmed for this county/);
  assert.match(read("js/boot.js"), /dfyServiceAmount\(\)/);
  assert.equal(banned.test(read("js/boot.js")), false);
  assert.equal(banned.test(read("js/engine.js")), false);
  assert.equal(banned.test(read("js/pages/sign.js")), false);
  const santaCruz = JSON.parse(read("data/counties/santa_cruz.json"));
  const apn = santaCruz.filing.portal_notes.find(note => /APN/.test(note));
  assert.match(apn, /Retry before treating it as a rejection/);
  assert.equal(banned.test(apn), false);
  assert.equal(customerLine(apn), apn.trim());
  assert.equal(banned.test(read("data/counties/santa_cruz.json")), false);
  assert.equal(banned.test(read("backend/functions/counties/santa_cruz.json")), false);
});

test("customer pages do not say your county's rules, unless your county, or launch-county rules", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const banned = /county's rules|unless your county|launch-county rules/i;
  for (const page of customerPages()) {
    assert.equal(banned.test(visibleCopy(read(page))), false, page);
  }
  for (const file of [
    "js/engine.js", "js/pricing.js", "js/outcome.js", "js/caseStatus.js", "js/boot.js", "js/kitdoc.js",
    "js/pages/filed.js", "js/pages/results.js", "js/pages/checkout.js", "js/pages/intake.js",
    "js/pages/kit.js", "js/pages/dashboard.js", "js/pages/sign.js", "js/pages/values.js"
  ]) {
    assert.equal(banned.test(read(file)), false, file);
  }
  assert.match(read("dashboard.html"), /Keep paying your property taxes on time\. An appeal does not pause your bill\./);
  assert.equal(/launch-county/i.test(read("faq.html")), false);
  assert.equal(/launch-county/i.test(read("index.html")), false);
  assert.equal(read("faq.html").includes("Santa Cruz County's details"), false);
  const santaCruz = JSON.parse(read("data/counties/santa_cruz.json"));
  assert.equal(countyDetailsLabel(santaCruz), "Santa Cruz County's details");
  assert.equal(countyDetailsLabel({ county: "Yolo County" }), "Yolo County's details");
  assert.match(read("js/boot.js"), /countyDetailsLabel\(county\)/);
  assert.match(read("faq.html"), /data-county-details[\s\S]*proportionate refund/);
});

test("customer pages do not link to the ops page", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const pages = customerPages();
  for (const page of ["index.html", "results.html", "values.html", "contact.html", "how-it-works.html"]) {
    assert.ok(pages.includes(page), page);
  }
  for (const page of pages) {
    assert.equal(read(page).includes("admin.html"), false, page);
  }
  const admin = read("admin.html");
  assert.match(admin, /<meta name="robots" content="noindex">/);
  assert.match(admin, /Staff demo only\. Not access-controlled in this prototype\./);
});

test("customer pages do not show the word adapter", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const pages = customerPages();
  assert.ok(pages.includes("index.html"));
  assert.ok(pages.includes("pricing.html"));
  assert.ok(pages.includes("faq.html"));
  assert.ok(pages.includes("how-it-works.html"));
  assert.ok(pages.includes("dashboard.html"));
  for (const page of pages) {
    assert.equal(/\badapter\b/i.test(visibleCopy(read(page))), false, page);
  }
});
