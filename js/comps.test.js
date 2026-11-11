import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compsBlockHtml } from "./comps.js";

const noEstimate = {
  outcome: "no_go",
  savings: {
    amount: null,
    low: null,
    mid: null,
    high: null,
    note: "No savings estimate, because your market value isn't below your assessed value."
  }
};

test("a result with no savings estimate does not show comps or a placeholder value", () => {
  const html = compsBlockHtml(noEstimate);
  assert.equal(html, "");
  assert.equal(html.includes("$0,000,000"), false);
  assert.equal(html.includes("0000 Sample"), false);
  const withEstimate = compsBlockHtml({ savings: { low: 750, mid: 1125, high: 1500 } });
  assert.match(withEstimate, /do not invent/);
  assert.equal(withEstimate.includes("case study"), false);
  assert.equal(withEstimate.includes("$0,000,000"), false);
  const results = readFileSync(new URL("./pages/results.js", import.meta.url), "utf8");
  assert.equal(results.includes("case study"), false);
  assert.equal(results.includes("$0,000,000"), false);
});
