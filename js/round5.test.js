import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATUTORY_DISCLOSURE, statutoryDisclosureHtml } from "./statutoryDisclosure.js";
import { AUTHORIZATION_RETENTION, retainUntil } from "./retention.js";
import { MONITOR_TERMS, monitorOfferHtml } from "./monitor.js";
import { CONFIG } from "./config.js";
import { CHECKOUT_PLANS, DIY_HOLD_NOTE } from "./pricing.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the statutory disclosure is one sentence, shared with reminder email", () => {
  const backend = read("../backend/functions/disclosure.js");
  assert.ok(backend.includes(STATUTORY_DISCLOSURE));
  const html = statutoryDisclosureHtml();
  assert.ok(html.includes(`<b>${STATUTORY_DISCLOSURE}</b>`));
  assert.ok(html.includes("statutory-disclosure"));
  assert.equal(STATUTORY_DISCLOSURE.startsWith("This assessment reduction filing service"), true);
  assert.notEqual(STATUTORY_DISCLOSURE, STATUTORY_DISCLOSURE.toUpperCase());
});

test("home and the Santa Cruz landing put the disclosure above the header", () => {
  for (const file of ["../index.html", "../santa-cruz/index.html", "../pricing.html", "../faq.html"]) {
    const html = read(file);
    const match = html.match(/<div class="statutory-disclosure[^"]*"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/);
    assert.equal(match && match[1], STATUTORY_DISCLOSURE, file);
    const box = html.indexOf('class="statutory-disclosure');
    const header = html.indexOf("<header");
    const h1 = html.indexOf("<h1");
    assert.ok(box > 0 && box < header && header < h1, file);
    assert.equal(html.includes('class="has-disclosure"') || html.includes("has-disclosure "), true);
  }
  const css = read("../style.css");
  assert.match(css, /\.disclosure\{[^}]*border:1px solid #c9d3de/);
  assert.match(css, /\.disclosure\{[^}]*background:#f3f5f8/);
  assert.match(css, /\.disclosure\{[^}]*color:#3e556e/);
  assert.match(css, /\.disclosure\{[^}]*padding:8px 16px/);
  assert.match(css, /\.disclosure\{[^}]*text-transform:none/);
  assert.equal(/text-transform:\s*uppercase/.test(css), false);
  assert.match(css, /--fs-disclosure:16px/);
  assert.match(css, /@media \(max-width:480px\)\{:root\{--fs-disclosure:15px/);
});

test("consent and signed authorizations are kept 3 years", () => {
  assert.equal(retainUntil("2026-10-13T00:00:00.000Z"), "2029-10-13T00:00:00.000Z");
  assert.equal(AUTHORIZATION_RETENTION, "Signed agent authorizations are kept 3 years.");
  assert.ok(read("../backend/functions/retention.js").includes(AUTHORIZATION_RETENTION));
});

test("the monitor offer is unchecked and the $249 card waits for county confirmation", () => {
  const offer = monitorOfferHtml({ email: "a@b.co", enrolled: false });
  assert.equal(/\schecked(?:=|\s|>)/.test(offer), false);
  assert.ok(offer.includes(MONITOR_TERMS));
  assert.ok(offer.includes("15 to 45 days"));
  const dfy = CHECKOUT_PLANS.find(plan => plan.id === "dfy");
  assert.equal(CONFIG.DIY_ENABLED, false);
  assert.equal(CHECKOUT_PLANS.some(plan => plan.id === "diy"), false);
  assert.equal(dfy.chargeNote, "We'll save your card today. You won't be charged until the county confirms your appeal is filed.");
  assert.equal(dfy.dueToday, 0);
  assert.equal(DIY_HOLD_NOTE, "Card saved. Not charged while payment timing is under attorney review.");
});
