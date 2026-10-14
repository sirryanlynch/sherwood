import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DISCLOSURES_URL, STATUTORY_DISCLOSURE, campaignTopDisclosure, statutoryDisclosureHtml } from "./statutoryDisclosure.js";
import { AUTHORIZATION_RETENTION, retainUntil } from "./retention.js";
import { MONITOR_TERMS, confirmationBody, monitorOfferHtml } from "./monitor.js";
import { CONFIG } from "./config.js";
import { CHECKOUT_PLANS, DIY_HOLD_NOTE } from "./pricing.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the statutory disclosure is one sentence, and emails link to the disclosures page", () => {
  const backend = read("../backend/functions/disclosure.js");
  assert.ok(backend.includes(STATUTORY_DISCLOSURE));
  assert.ok(backend.includes(DISCLOSURES_URL));
  const email = read("../backend/functions/email.js");
  assert.equal(email.includes("statutoryDisclosureHtml()"), false);
  assert.ok(email.includes("Disclosures: ${DISCLOSURES_URL}"));
  const page = read("../disclosures/index.html");
  const boxes = [...page.matchAll(/<div class="statutory-disclosure[^"]*"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/g)];
  assert.equal(boxes.length, 2);
  assert.ok(boxes.every(match => match[1] === STATUTORY_DISCLOSURE));
  const main = page.slice(page.indexOf("<main"), page.indexOf("</main>"));
  assert.ok(main.includes(`<b>${STATUTORY_DISCLOSURE}</b>`));
  assert.equal(page.slice(0, page.indexOf("<header")).includes("statutory-disclosure"), false);
  const note = confirmationBody({ cancelToken: "abc" });
  assert.equal(note.includes(STATUTORY_DISCLOSURE), false);
  assert.match(note, new RegExp(`Disclosures: ${DISCLOSURES_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  const html = statutoryDisclosureHtml();
  assert.ok(html.includes(`<b>${STATUTORY_DISCLOSURE}</b>`));
  assert.ok(html.includes("statutory-disclosure"));
  assert.equal(STATUTORY_DISCLOSURE.startsWith("This assessment reduction filing service"), true);
  assert.notEqual(STATUTORY_DISCLOSURE, STATUTORY_DISCLOSURE.toUpperCase());
});

test("headed pages keep the verbatim disclosure in the Disclosures dialog", () => {
  for (const file of ["../index.html", "../santa-cruz/index.html", "../pricing.html", "../faq.html"]) {
    const html = read(file);
    const match = html.match(/role="dialog"[\s\S]*?<div class="statutory-disclosure[^"]*"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/);
    assert.equal(match && match[1], STATUTORY_DISCLOSURE, file);
    const headerAt = html.indexOf("<header");
    const header = html.slice(headerAt, html.indexOf("</header>"));
    assert.equal(header.includes("data-disclosure-open"), false, file);
    assert.equal(html.slice(0, headerAt).includes("statutory-disclosure"), false, file);
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    assert.match(footer, /<button type="button" class="disclosure-link" data-disclosure-open[^>]*>Disclosures<\/button>/, file);
    assert.match(html, /aria-modal="true"/, file);
    assert.match(html, /data-disclosure-close[^>]*>Close</, file);
    const box = html.indexOf('class="statutory-disclosure');
    const h1 = html.indexOf("<h1");
    assert.ok(headerAt > 0 && box > headerAt && headerAt < h1, file);
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

test("the top disclosure box stays off, and the flag still recognizes campaign sources", () => {
  assert.equal(CONFIG.DISCLOSURE_TOP_FOR_CAMPAIGN, false);
  const on = { DISCLOSURE_TOP_FOR_CAMPAIGN: true };
  for (const src of ["postcard-scz", "postcard-anything", "postcard-", "social", "search"]) {
    assert.equal(campaignTopDisclosure(src), false, src);
    assert.equal(campaignTopDisclosure(src, on), true, src);
  }
  for (const src of ["mail1", "", null, "Postcard-scz", "postcard", "search-ad", "social-ig"]) {
    assert.equal(campaignTopDisclosure(src), false, String(src));
    assert.equal(campaignTopDisclosure(src, on), false, String(src));
  }
  const dialogJs = read("../js/statutoryDisclosure.js");
  assert.match(dialogJs, /event\.key === "Escape"/);
  assert.match(dialogJs, /event\.key !== "Tab"/);
  assert.match(dialogJs, /data-disclosure-close/);
  assert.match(dialogJs, /lastFocus\.focus\(\)/);
  const app = read("../app.js");
  assert.ok(app.indexOf("captureFirstTouch()") < app.indexOf("bindDisclosureDialog()"));
  assert.match(read("../cancel.html"), /bindDisclosureDialog\(\)/);
  for (const file of ["../sc/index.html", "../scz/index.html"]) {
    const html = read(file);
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    assert.match(footer, /data-disclosure-open[^>]*>Disclosures<\/button>/, file);
    const match = html.match(/role="dialog"[\s\S]*?<div class="statutory-disclosure[^"]*"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/);
    assert.equal(match && match[1], STATUTORY_DISCLOSURE, file);
    assert.ok(html.indexOf("<p><a") < html.indexOf('class="statutory-disclosure'), file);
    assert.equal(html.slice(0, html.indexOf("<p><a")).includes("statutory-disclosure"), false, file);
  }
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
