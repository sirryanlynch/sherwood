import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { paymentsAdapter } from "./adapters/payments.js";
import { authorizationReady, signedBeforeFiling } from "./authorization.js";
import { STATUTORY_DISCLOSURE } from "./statutoryDisclosure.js";
import { deadlineBadge } from "./engine.js";
import { purchaseOffer } from "./offer.js";
import { CARD_SAVE_NOTE, planPriceLines } from "./pricing.js";
import { CONFIG } from "./config.js";

const readCounty = (name) => JSON.parse(readFileSync(new URL(`../data/counties/${name}.json`, import.meta.url), "utf8"));
const oct13 = new Date(2026, 9, 13);
const CLOSED = ["alameda", "alpine", "inyo", "kings", "mono", "placer", "san_francisco", "san_luis_obispo", "santa_clara", "sierra", "ventura"];
const PAPER = ["sacramento", "contra_costa", "fresno", "placer", "sonoma", "san_luis_obispo", "orange", "riverside"];
const WAIVER = ["los_angeles", "san_francisco", "alameda", "santa_cruz", "san_bernardino", "sonoma"];

test("county files replace the templates and leave Santa Cruz verified", () => {
  const index = JSON.parse(readFileSync(new URL("../data/counties/index.json", import.meta.url), "utf8"));
  assert.equal(index.length, 58);
  assert.equal(index.some(name => name.startsWith("template_")), false);
  assert.equal(readdirSync(new URL("../data/counties/", import.meta.url)).filter(name => name.startsWith("template_")).length, 0);
  const statuses = index.map(name => readCounty(name.replace(/\.json$/, "")).status);
  assert.equal(statuses.filter(status => status === "verified").length, 1);
  assert.equal(readCounty("santa_cruz").status, "verified");
  assert.equal(statuses.filter(status => status === "unconfirmed").length, 57);
});

test("Santa Cruz keeps the $50 fee and the July 2 window, without a $30 paper fee", () => {
  const county = readCounty("santa_cruz");
  assert.equal(county.filing.filing_fee.amount, 50);
  assert.equal(county.filing.regular_window.start, "2026-07-02");
  assert.equal(county.filing.regular_window.end, "2026-11-30");
  assert.equal(county.filing.paper_fee.amount, null);
  assert.equal(JSON.stringify(county).includes("$30"), false);
  assert.match(county.agent_authorization.doc_title, /SCC form/);
  assert.match(county.informal_review, /Assessor accepts a Prop 8/);
  assert.equal(county.fee_waiver.available, true);
});

test("closed, paper, Los Angeles, and fee-waiver gates come from the county files", () => {
  for (const id of CLOSED) assert.equal(readCounty(id).filing.regular_window.end, "2026-09-15", id);
  for (const id of PAPER) {
    const county = readCounty(id);
    assert.equal(county.filing.efile, false, id);
    assert.equal(county.filing.wet_signature_required, true, id);
    assert.equal(county.filing.dfy_available, false, id);
    const offer = purchaseOffer(county, oct13);
    assert.equal(offer.dfy, false, id);
    assert.equal(offer.reminder, true, id);
  }
  const la = readCounty("los_angeles");
  assert.equal(la.agent.registration_required, true);
  assert.equal(la.filing.efile_fee.surcharge, 1.49);
  assert.equal(la.filing.cutoff_time, "midnight PST");
  const laOffer = purchaseOffer(la, oct13);
  assert.equal(laOffer.diy, false);
  assert.equal(laOffer.dfy, false);
  const sf = readCounty("san_francisco");
  assert.equal(sf.filing.efile_fee.surcharge, 3);
  assert.equal(sf.filing.cutoff_time, "midnight");
  assert.equal(purchaseOffer(sf, oct13).reminder, true);
  const clara = readCounty("santa_clara");
  assert.equal(clara.filing.filing_fee.amount, 290);
  assert.equal(clara.filing.filing_fee.commercial, 675);
  assert.equal(clara.filing.postmark_ok, true);
  for (const id of WAIVER) assert.equal(readCounty(id).fee_waiver.available, true, id);
  const cruz = purchaseOffer(readCounty("santa_cruz"), oct13);
  assert.equal(cruz.diy, false);
  assert.equal(cruz.dfy, true);
  const late = purchaseOffer(readCounty("santa_cruz"), new Date(2026, 10, 28));
  assert.equal(late.dfy, false);
  assert.equal(late.diy, false);
});

test("a zero county fee is not described as included, and the $199 display stays off", () => {
  assert.equal(CONFIG.SHOW_199_PLUS_COUNTY_FEE, false);
  const cruz = planPriceLines(readCounty("santa_cruz"));
  assert.equal(cruz.dfy, "$249, county fee included.");
  const orange = planPriceLines(readCounty("orange"));
  assert.equal(orange.fee, null);
  assert.equal(orange.dfy.includes("included"), false);
  assert.equal(deadlineBadge(readCounty("santa_cruz"), oct13), "County filing deadline: Nov 30, 2026");
});

test("checkout saves a card and does not mark it paid", async () => {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: key => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => mem.set(key, String(value))
  };
  const setup = await paymentsAdapter.saveCard({ userId: "u", matterId: "m", plan: { id: "dfy" } });
  assert.equal(setup.object, "setup_intent");
  assert.equal(setup.status, "card_saved");
  assert.equal(setup.amount, 0);
  const charge = await paymentsAdapter.chargeSavedCard({
    userId: "u",
    matterId: "m",
    setupIntentId: setup.id,
    amount: 249
  });
  assert.equal(charge.status, "succeeded");
  assert.equal(CARD_SAVE_NOTE, "We'll save your card today. You won't be charged until the county confirms your appeal is filed.");
});

test("agent authorization needs a title and a signature before the filing time", () => {
  const auth = {
    signedAt: "2026-10-13T12:00:00.000Z",
    signerName: "Ada Owner",
    signerTitle: "Owner",
    parcel: "1 Main, APN 1",
    ownerGetsCopy: true,
    agentName: "Ada Agent",
    agentAddress: "1 Agent Way, Santa Cruz, CA 95060",
    agentPhone: "(831) 555-0100",
    taxYears: [2026]
  };
  assert.equal(authorizationReady(auth), true);
  assert.equal(authorizationReady({ ...auth, signerTitle: "" }), false);
  assert.equal(authorizationReady({ ...auth, agentName: "[pending]", agentAddress: "[pending]", agentPhone: "[pending]" }), false);
  assert.equal(authorizationReady({ ...auth, agentPhone: "[pending]" }), false);
  assert.equal(signedBeforeFiling(auth, "2026-10-13T13:00:00.000Z"), true);
  assert.equal(signedBeforeFiling(auth, "2026-10-13T11:00:00.000Z"), false);
  assert.equal(signedBeforeFiling({ ...auth, agentName: "[pending]" }, "2026-10-13T13:00:00.000Z"), false);
});

test("every page keeps the verbatim disclosure outside a collapsible", () => {
  const pages = readdirSync(new URL("../", import.meta.url)).filter(name => name.endsWith(".html"));
  pages.push("santa-cruz/index.html", "san-diego/index.html", "san-mateo/index.html", "santa-barbara/index.html", "scz/index.html", "sc/index.html", "disclosures/index.html");
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  assert.match(css, /--fs-disclosure:16px/);
  assert.match(css, /--fs-h1:32px/);
  assert.match(css, /@media \(max-width:480px\)\{:root\{--fs-disclosure:16px;--fs-h1:28px/);
  for (const name of pages) {
    const html = readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    const match = html.match(/<div class="statutory-disclosure[^"]*"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/);
    assert.equal(match && match[1], STATUTORY_DISCLOSURE, name);
    const boxAt = html.indexOf('class="statutory-disclosure');
    const headerAt = html.indexOf("<header");
    const footerAt = html.indexOf("<footer");
    const dialogAt = html.indexOf('role="dialog"');
    assert.ok(boxAt >= 0 && footerAt >= 0 && dialogAt >= 0 && boxAt > dialogAt, name);
    const footer = html.slice(footerAt, html.indexOf("</footer>"));
    assert.match(footer, /data-disclosure-open[^>]*>Disclosures<\/button>/, name);
    assert.match(html, /aria-modal="true"/, name);
    assert.match(html, /data-disclosure-close[^>]*>Close</, name);
    if (headerAt !== -1) {
      assert.equal(html.slice(headerAt, html.indexOf("</header>")).includes("data-disclosure-open"), false, name);
      assert.equal(html.slice(0, headerAt).includes("statutory-disclosure"), false, name);
      assert.ok(dialogAt > headerAt, name);
    } else {
      assert.equal(html.slice(0, html.indexOf("<p><a")).includes("statutory-disclosure"), false, name);
    }
    assert.ok(html.includes("has-disclosure"), name);
    assert.equal(html.includes("data-statutory-disclosure"), false, name);
    assert.equal(/<details[\s\S]*statutory-disclosure/.test(html), false, name);
  }
});
