import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { authorizationReady } from "./authorization.js";
import { STATUTORY_DISCLOSURE } from "./statutoryDisclosure.js";
import { CONFIG } from "./config.js";
import { deadlineBadge } from "./engine.js";
import {
  marginBlocksDfy, offerMessage, orderBadgeHtml, orderCloseLine, orderCountdownText, orderCutoffIso, pastOrderCutoff, purchaseOffer
} from "./offer.js";
import { landingHomeLine, planPriceLines } from "./pricing.js";
import { countyBySlug, headlinePlace } from "./place.js";

const readCounty = (name) => JSON.parse(readFileSync(new URL(`../data/counties/${name}.json`, import.meta.url), "utf8"));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const oct13 = new Date(2026, 9, 13);
const nov25 = new Date(2026, 10, 25, 18, 0, 0);
const nov26 = new Date(2026, 10, 26, 0, 30, 0);

test("Kern, Stanislaus, Tulare, and Yolo record their own forms, and Stanislaus still ends Nov 30", () => {
  for (const id of ["kern", "stanislaus", "tulare", "yolo"]) {
    const county = readCounty(id);
    assert.equal(county.status, "unconfirmed", id);
    assert.equal(county.county_form.agent_authorization.exists, true, id);
    assert.match(county.county_form.agent_authorization.url, /^https:\/\//, id);
  }
  assert.equal(readCounty("kern").county_form.revocation.exists, false);
  assert.equal(readCounty("stanislaus").county_form.revocation.exists, false);
  assert.equal(readCounty("tulare").county_form.revocation.exists, true);
  assert.equal(readCounty("yolo").county_form.revocation.exists, true);
  assert.equal(readCounty("kern").filing.efile, false);
  assert.equal(readCounty("stanislaus").filing.filing_fee, 30);
  assert.equal(readCounty("tulare").filing.efile, false);
  assert.equal(readCounty("yolo").filing.efile, true);
  assert.equal(readCounty("yolo").filing.filing_fee, 45);
  assert.equal(readCounty("stanislaus").filing.regular_window.end, "2026-11-30");
  const statuses = JSON.parse(read("data/counties/index.json")).map(name => readCounty(name.replace(/\.json$/, "")).status);
  assert.equal(statuses.filter(status => status === "verified").length, 1);
});

test("Santa Cruz We file it stops at the end of Nov 25 and the badge counts down to that day", () => {
  assert.equal(CONFIG.order_cutoff, "2026-11-25");
  const county = readCounty("santa_cruz");
  assert.equal(orderCutoffIso(county), "2026-11-25");
  assert.equal(pastOrderCutoff(county, nov25), false);
  assert.equal(pastOrderCutoff(county, nov26), true);
  assert.equal(purchaseOffer(county, nov25).dfy, true);
  assert.equal(purchaseOffer(county, nov26).dfy, false);
  assert.equal(purchaseOffer(county, nov26).diy, true);
  assert.equal(deadlineBadge(county), "County filing deadline: Nov 30, 2026");
  assert.equal(orderCloseLine(county), "We file it orders close Nov 25");
  const badge = orderBadgeHtml(county);
  assert.match(badge, /County filing deadline: Nov 30, 2026/);
  assert.match(badge, /We file it orders close Nov 25/);
  assert.match(badge, /data-order-countdown="2026-11-25"/);
  assert.equal(/\d+ days left/.test(badge), false);
  const noon = orderCountdownText("2026-11-25", new Date(2026, 10, 25, 12, 0, 0));
  assert.equal(noon, "0 days, 12 hours, 0 minutes, 0 seconds");
  assert.equal(orderCountdownText("2026-11-25", nov26), "We file it orders are closed.");
  assert.match(read("santa-cruz/index.html"), /data-order-badge/);
  assert.match(read("index.html"), /data-order-badge/);
});

test("the fee-waiver question links out and does not restate criteria", () => {
  const intake = read("js/pages/intake.js");
  assert.match(intake, /The county's fee-waiver criteria/);
  assert.equal(/public benefits|low income|low-income|68632|hardship|may exist/i.test(intake), false);
  assert.equal(readCounty("santa_cruz").fee_waiver.url, "https://www2.santacruzcountyca.gov/AAB");
  assert.equal(readCounty("san_francisco").fee_waiver.url, "https://sfgov.org/aab/fees");
  for (const id of ["los_angeles", "alameda", "san_bernardino", "sonoma"]) {
    assert.equal(readCounty(id).fee_waiver.url, null, id);
  }
});

test("Santa Cruz agent authorization offers both Local Rule 6 paths", () => {
  const county = readCounty("santa_cruz");
  const ids = county.agent_authorization.local_rule_6.options.map(option => option.id);
  assert.deepEqual(ids, ["application_section", "county_form"]);
  const sign = read("js/pages/sign.js");
  assert.match(sign, /Application authorization section|rule6/);
  assert.match(sign, /county Agent Authorization form/);
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
  assert.equal(authorizationReady(auth, county), false);
  assert.equal(authorizationReady({ ...auth, agentName: "[pending]", agentAddress: "[pending]", agentPhone: "[pending]", rule6Option: "county_form" }, county), false);
  assert.equal(authorizationReady({ ...auth, rule6Option: "county_form" }, county), true);
  assert.equal(authorizationReady({ ...auth, rule6Option: "application_section" }, county), true);
});

test("San Diego, San Mateo, and Santa Barbara landings stay unlisted", () => {
  assert.equal(CONFIG.LANDING_DFY.san_diego, false);
  assert.equal(CONFIG.LANDING_DFY.san_mateo, false);
  assert.equal(CONFIG.LANDING_DFY.santa_barbara, false);
  assert.equal(Object.keys(CONFIG.LANDING_DFY).length, 3);
  assert.equal(countyBySlug("san-diego").id, "san_diego");
  assert.equal(headlinePlace({ param: countyBySlug("san-diego") }), "San Diego");
  assert.equal(headlinePlace({ param: countyBySlug("san-mateo") }), "San Mateo");
  assert.equal(headlinePlace({ param: countyBySlug("santa-barbara") }), "Santa Barbara");
  const diego = readCounty("san_diego");
  const mateo = readCounty("san_mateo");
  const barbara = readCounty("santa_barbara");
  assert.equal(diego.status, "unconfirmed");
  assert.equal(mateo.status, "unconfirmed");
  assert.equal(barbara.status, "unconfirmed");
  assert.equal(purchaseOffer(diego, oct13).dfy, false);
  assert.equal(purchaseOffer({ ...diego, status: "verified" }, oct13).dfy, false);
  assert.equal(purchaseOffer({ ...mateo, status: "verified" }, oct13).dfy, false);
  assert.equal(purchaseOffer({ ...barbara, status: "verified" }, oct13).dfy, false);
  const diegoLine = landingHomeLine(diego);
  assert.equal(diegoLine, "Check for free. If there's a case, file it yourself for $79, or we'll file it for you for $249.");
  assert.equal(/county fee|included/i.test(diegoLine), false);
  assert.equal(planPriceLines(diego).fee, null);
  assert.equal(planPriceLines(diego).dfy, "$249");
  const mateoLine = landingHomeLine(mateo);
  assert.match(mateoLine, /\$79 \+ \$30 county fee, paid when you file/);
  assert.match(mateoLine, /\$249, county fee included/);
  assert.equal(mateo.filing.fee_confirmed.amount, 30);
  assert.equal(mateo.filing.fee_confirmed.source_url, "https://www.smcgov.org/ceo/assessment-appeals-board");
  assert.equal(mateo.filing.efile_fee.source_url, "https://www.smcgov.org/ceo/assessment-appeals-board");
  const barbaraLine = landingHomeLine(barbara);
  assert.match(barbaraLine, /\$79 \+ \$65 county fee, paid when you file/);
  assert.match(barbaraLine, /\$249, county fee included/);
  assert.equal(planPriceLines(barbara).fee, 65);
  for (const path of ["san-diego/index.html", "san-mateo/index.html", "santa-barbara/index.html"]) {
    const html = read(path);
    assert.match(html, /name="robots" content="noindex"/);
    const match = html.match(/<div class="statutory-disclosure[^"]*"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/);
    assert.equal(match && match[1], STATUTORY_DISCLOSURE);
    assert.ok(html.indexOf('class="statutory-disclosure') < html.indexOf("<header"));
    assert.match(html, /has-disclosure/);
    assert.equal(/<details[\s\S]*statutory-disclosure/.test(html), false);
  }
  assert.match(read("santa-barbara/index.html"), /\$249, county fee included/);
  const linked = readdirSync(new URL("../", import.meta.url))
    .filter(name => name.endsWith(".html"))
    .filter(name => /san-diego\/|san-mateo\/|santa-barbara\//.test(read(name)));
  assert.deepEqual(linked, []);
  assert.equal(/san-diego\/|san-mateo\/|santa-barbara\//.test(read("santa-cruz/index.html")), false);
});

test("Mendocino, Madera, and Shasta keep We file it off after confirmation", () => {
  for (const id of ["mendocino", "madera", "shasta"]) {
    const county = readCounty(id);
    assert.equal(county.wefile_margin_block, true, id);
    assert.equal(county.status, "unconfirmed", id);
    assert.equal(marginBlocksDfy(county), true, id);
    const confirmed = { ...county, status: "verified" };
    if (id === "shasta") {
      confirmed.filing = { ...county.filing, efile: true, wet_signature_required: false, dfy_available: true };
    }
    const offer = purchaseOffer(confirmed, oct13);
    assert.equal(offer.dfy, false, id);
    assert.equal(offer.margin, true, id);
    assert.equal(offerMessage(confirmed, offer), "We file it stays off in this county until the price changes.");
  }
  assert.equal(readCounty("santa_cruz").wefile_margin_block, undefined);
  assert.equal(purchaseOffer(readCounty("santa_cruz"), oct13).dfy, true);
});
