import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide, recommendsFiling, SAVINGS_LOW_SHARE } from "./engine.js";
import { personaFromSearch } from "./personas.js";
import { customerOutcome } from "./outcome.js";
import { CASE_EMAIL_KINDS, caseEmailDraft } from "./caseMail.js";
import { nextActionLine } from "./caseStatus.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const county = JSON.parse(read("data/counties/santa_cruz.json"));
const oct13 = new Date(2026, 9, 13);

test("persona doors route into the same check", () => {
  assert.equal(personaFromSearch("?for=parent"), "family");
  assert.equal(personaFromSearch("for=portfolio"), "portfolio");
  assert.equal(personaFromSearch("?for=parent&county=santa-cruz"), "family");
  assert.equal(personaFromSearch("?county=santa-cruz"), "home");
  assert.equal(personaFromSearch(""), "home");
  const home = read("index.html");
  assert.match(home, /Your property tax appeal, handled\./);
  assert.match(home, /href="index\.html\?for=parent"/);
  assert.match(home, /href="index\.html\?for=portfolio"/);
  assert.match(home, /href="understand\/"/);
  assert.match(home, /id="check-form"/);
  assert.equal(home.includes("Many California homes"), false);
  assert.match(read("understand/index.html"), /What your assessment notice is telling you/);
  assert.match(read("steward/index.html"), /power of attorney or a conservatorship/);
  assert.match(read("steward/index.html"), /No payment was taken/);
});

test("no action when the market estimate is not below the assessed value", () => {
  const decision = decide({
    county,
    today: oct13,
    assessed: 500000,
    market: 500000,
    tax: 6000,
    confidence: "sure"
  });
  assert.equal(decision.outcome, "no_go");
  assert.equal(recommendsFiling(decision), false);
  assert.equal(customerOutcome(decision.outcome).title, "No action recommended.");
  assert.equal(customerOutcome(decision.outcome).id, "no_action");
});

test("no action when the low savings estimate is under the We file it fee", () => {
  const decision = decide({
    county,
    today: oct13,
    assessed: 200000,
    market: 190000,
    tax: 2500,
    confidence: "sure"
  });
  assert.equal(decision.outcome, "no_go");
  assert.equal(decision.savings.low, decision.savings.amount * SAVINGS_LOW_SHARE);
  assert.ok(decision.savings.low < 249);
  assert.equal(recommendsFiling(decision), false);
  assert.match(decision.reasons.join(" "), /does not recommend filing/);
  assert.match(read("js/pages/results.js"), /No action recommended\./);
  assert.equal(read("js/pages/results.js").includes("There is no checkout on a no-go."), false);
});

test("filing is recommended only when the low estimate clears $249", () => {
  const decision = decide({
    county,
    today: oct13,
    assessed: 1233915,
    market: 1075000,
    tax: 15176.44,
    confidence: "sure"
  });
  assert.equal(decision.outcome, "go");
  assert.ok(decision.savings.low >= 249);
  assert.equal(decision.savings.mid, decision.savings.amount);
  assert.equal(decision.savings.high, decision.savings.amount);
  assert.equal(recommendsFiling(decision), true);
  assert.equal(customerOutcome("go").title, "You likely have a case.");
});

test("the case record is read-only and the five emails exist", () => {
  assert.deepEqual(CASE_EMAIL_KINDS, ["received", "signed", "filed", "hearing_scheduled", "decision"]);
  const draft = caseEmailDraft("filed", { address: "701 Ocean Street", filing: { id: "file_1" } }, county);
  assert.match(draft.subject, /701 Ocean Street/);
  assert.match(draft.body, /file_1/);
  assert.deepEqual(draft.attachments, ["authorization.pdf", "application-preview.pdf"]);
  const dash = read("js/pages/dashboard.js");
  assert.match(dash, /I got my hearing notice/);
  assert.match(dash, /nextActionLine/);
  assert.equal(dash.includes("Advance one stage"), false);
  assert.equal(dash.includes("<textarea"), false);
  assert.equal(dash.includes("contenteditable"), false);
  const line = nextActionLine({ stage: "hearing_scheduled", hearing: { date: "2026-12-01" } });
  assert.match(line, /You attend the hearing on December 1, 2026/);
  assert.match(read("js/pages/filed.js"), /poaReviewed/);
  assert.match(read("privacy.html"), /Social Security number/);
  assert.match(read("privacy.html"), /do not collect bank details/i);
  assert.match(read("privacy.html"), /\[pending attorney review\]/);
});
