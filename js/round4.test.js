import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deadlineBadge, decide, filingWindow, nextWindowCopy } from "./engine.js";
import { planPriceLines } from "./pricing.js";
import { formatShortDay } from "./format.js";
import { AGENT_CONTACT, normalizeTaxYears, taxYearChoices } from "./authorization.js";

const county = JSON.parse(readFileSync(new URL("../data/counties/santa_cruz.json", import.meta.url), "utf8"));
const oct13 = new Date(2026, 9, 13);

test("October 13, 2026 is inside the Santa Cruz filing window", () => {
  const window = filingWindow(county, oct13);
  assert.equal(window.state, "open");
  assert.equal(window.kind, "regular");
  const decision = decide({
    county,
    today: oct13,
    assessed: 500000,
    market: 400000,
    tax: 6000,
    confidence: "sure"
  });
  assert.equal(decision.outcome, "go");
  assert.equal(decision.fee, 50);
});

test("the open plan step names the November 30 deadline", () => {
  assert.equal(formatShortDay("2026-11-30"), "Nov 30, 2026");
  assert.equal(deadlineBadge(county), "County filing deadline: Nov 30, 2026");
});

test("a future window is quoted from the county file and promises nothing", () => {
  const copy = nextWindowCopy(county, new Date(2026, 6, 1));
  assert.equal(copy, "The next filing window in this county file is Jul 2, 2026 through Nov 30, 2026. No outcome is promised.");
});

test("a passed window names the next July 2 and does not promise a close date", () => {
  const copy = nextWindowCopy(county, new Date(2026, 11, 1));
  assert.equal(copy, "Filing closed Nov 30, 2026. The next regular window opens July 2, 2027. This county file does not list that year's close date. No outcome is promised.");
});

test("the pricing line combines the DIY fee", () => {
  const lines = planPriceLines(county);
  assert.equal(lines.diyLine, "$79 + $50 county fee, paid when you file");
  assert.equal(lines.feeNote, "The county fee is non-refundable. Fee waivers exist.");
  assert.equal(county.filing.filing_fee.refundable, false);
  assert.equal(county.filing.regular_window.source_url, "https://www2.santacruzcountyca.gov/AAB/Content/SupportFiles/Filing%20Deadlines%20and%20Appeal%20Information.pdf");
});

test("agent authorization covers at most four tax years and leaves the agent pending", () => {
  const choices = taxYearChoices(county, oct13);
  assert.deepEqual(choices, [2026, 2025, 2024, 2023]);
  assert.equal(choices.length, 4);
  assert.deepEqual(normalizeTaxYears([2020, 2026, 2026, 2030], choices), [2026]);
  assert.equal(AGENT_CONTACT.name, "[pending]");
  assert.equal(AGENT_CONTACT.address, "[pending]");
  assert.equal(AGENT_CONTACT.phone, "[pending]");
});
