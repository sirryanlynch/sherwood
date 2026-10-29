import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargeReady, countyFeeUncaptured, recordCountyConfirmation } from "./chargeGate.js";
import { CONFIG } from "./config.js";
import { offerMessage, purchaseOffer, reminderButtonLabel, reminderOnly } from "./offer.js";
import { CHECKOUT_PLANS, HEARING_STATEMENT, planById } from "./pricing.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readCounty = (name) => JSON.parse(readFileSync(new URL(`../data/counties/${name}.json`, import.meta.url), "utf8"));
const oct13 = new Date(2026, 9, 13);

test("DIY is disabled, including the Los Angeles override, and is not offered", () => {
  assert.equal(CONFIG.DIY_ENABLED, false);
  assert.equal(CHECKOUT_PLANS.some(plan => plan.id === "diy"), false);
  assert.equal(planById("diy"), null);
  assert.equal(planById("dfy").name, "We file it");
  for (const id of ["santa_cruz", "los_angeles", "san_diego", "yolo"]) {
    assert.equal(purchaseOffer(readCounty(id), oct13).diy, false, id);
  }
  const la = purchaseOffer(readCounty("los_angeles"), oct13);
  assert.equal(la.dfy, false);
  assert.equal(la.reminder, true);
  assert.equal(read("pricing.html").includes("DIY kit"), false);
  assert.equal(read("pricing.html").includes("plan-diy-price"), false);
  assert.equal(read("how-it-works.html").includes("DIY kit"), false);
  assert.equal(read("kit.html").includes("DIY"), false);
  assert.equal(HEARING_STATEMENT, "We prepare your evidence, file your appeal, and work toward an informal reduction or settlement with the Assessor. If your case goes to a hearing, you attend (in person or by video where the county allows) using a hearing packet we prepare. If no one attends, the board will deny the appeal.");
  assert.equal(/<td><b>Contingency<\/b>/.test(read("pricing.html")), false);
  assert.equal(read("pricing.html").toLowerCase().includes("coming soon"), false);
  const paper = purchaseOffer(readCounty("sacramento"), oct13);
  assert.equal(paper.paper, true);
  assert.equal(paper.diy, false);
  assert.equal(paper.dfy, false);
  assert.equal(offerMessage(readCounty("sacramento"), paper).toLowerCase().includes("mail it yourself"), false);
  assert.equal(read("js/pages/results.js").includes("Or mail it yourself"), false);
  assert.equal(read("js/pages/values.js").includes("paper / mail"), false);
  assert.equal(read("js/pages/values.js").includes("Or mail it yourself"), false);
  for (const id of ["los_angeles", "san_diego", "san_mateo", "santa_barbara"]) {
    const offer = purchaseOffer(readCounty(id), oct13);
    assert.equal(reminderOnly(offer), true, id);
    assert.equal(reminderButtonLabel(offer), "Remind me", id);
  }
  assert.equal(reminderOnly(paper), false);
  assert.equal(reminderButtonLabel(paper), "Email me a reminder");
  for (const path of ["san-diego/index.html", "san-mateo/index.html", "santa-barbara/index.html"]) {
    const html = read(path);
    assert.match(html, />Remind me</);
    assert.equal(html.includes("we'll file it for you for $249"), false);
    assert.equal(html.includes("Check my property"), false);
    assert.equal(html.includes("Check a property anyway"), false);
    assert.equal((html.match(/<button/g) || []).length, 3, path);
    assert.equal((html.match(/data-disclosure-open/g) || []).length, 1, path);
    assert.equal((html.match(/data-disclosure-close/g) || []).length, 1, path);
  }
  const results = read("js/pages/results.js");
  assert.match(results, /reminderOnly\(offer\)/);
  assert.equal(results.includes("Or mail it yourself"), false);
});

test("the marketing pages keep the check, the flat fee, and the pilot estimates", () => {
  const home = read("index.html");
  assert.match(home, /id="check-form"/);
  assert.match(home, /id="check-form-end"/);
  assert.match(home, /data-kind="check"/);
  assert.match(home, /name="address"/);
  assert.match(home, /data-place-bar/);
  assert.match(home, /data-headline-city/);
  assert.match(home, /id="home-price"/);
  assert.match(home, /id="home-launch"/);
  assert.match(home, /id="home-other"/);
  assert.match(home, /id="home-ambiguous"/);
  assert.match(home, /id="county-reminder"/);
  assert.match(home, /id="show-check"/);
  assert.match(home, /id="home-under"/);
  assert.match(home, /data-order-badge/);
  assert.match(home, /Flat \$249 when we file/);
  assert.match(home, /You keep 100%/);
  assert.match(home, /\$158,915/);
  assert.match(home, /~\$1,955\/yr/);
  assert.equal(home.includes("Savings Guarantee"), false);
  assert.equal(/Trustpilot|success rate/i.test(home), false);
  const how = read("how-it-works.html");
  assert.match(how, /id="how-plans"/);
  assert.match(how, /id="launch-filing"/);
  const pricing = read("pricing.html");
  assert.match(pricing, /id="plan-dfy-price"/);
  assert.match(pricing, /id="filing-fee-note"/);
  assert.match(pricing, /\[DRAFT – pending attorney review\]/);
  assert.match(pricing, /\$49\/yr/);
});

test("ops records a county confirmation, and a simulated filing still cannot be charged", () => {
  const fee = { countyFeePaid: "50.00", countyFeePaidOn: "2026-10-14", countyFeeReceipt: "RCPT-1" };
  assert.equal(recordCountyConfirmation({}, { confirmedOn: "2026-10-14", countyReference: "SCC-1", ...fee }).ok, false);
  const missingDate = { filing: { id: "file_1", filedAt: "2026-10-13T18:00:00.000Z", simulated: false } };
  assert.equal(recordCountyConfirmation(missingDate, { confirmedOn: "", countyReference: "SCC-1", ...fee }).ok, false);
  assert.equal(recordCountyConfirmation(missingDate, { confirmedOn: "2026-10-14", countyReference: " [pending] ", ...fee }).ok, false);
  assert.equal(missingDate.filing.countyConfirmedAt, undefined);
  assert.equal(missingDate.filing.countyFeePaidCents, undefined);

  const badFee = { filing: { id: "file_1", filedAt: "2026-10-13T18:00:00.000Z", simulated: false } };
  assert.equal(recordCountyConfirmation(badFee, { confirmedOn: "2026-10-14", countyReference: "SCC-1", ...fee, countyFeePaid: "50.555" }).ok, false);
  assert.equal(recordCountyConfirmation(badFee, { confirmedOn: "2026-10-14", countyReference: "SCC-1", ...fee, countyFeePaid: "-1" }).ok, false);
  assert.equal(recordCountyConfirmation(badFee, { confirmedOn: "2026-10-14", countyReference: "SCC-1", ...fee, countyFeePaidOn: "" }).ok, false);
  assert.equal(recordCountyConfirmation(badFee, { confirmedOn: "2026-10-14", countyReference: "SCC-1", ...fee, countyFeeReceipt: " [pending] " }).ok, false);
  assert.equal(badFee.filing.countyConfirmedAt, undefined);
  assert.equal(badFee.filing.countyFeePaidCents, undefined);
  assert.equal(badFee.filing.countyFeePaidAt, undefined);
  assert.equal(badFee.filing.countyFeeReceipt, undefined);

  const simulated = { filing: { id: "file_1", filedAt: "2026-10-13T18:00:00.000Z", simulated: true } };
  const saved = recordCountyConfirmation(simulated, {
    confirmedOn: "2026-10-14",
    countyReference: " SCC-42 ",
    countyFeePaid: "$50.10",
    countyFeePaidOn: "2026-10-13",
    countyFeeReceipt: " FEE-42 "
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.matter.filing.countyConfirmedAt, "2026-10-14T00:00:00.000Z");
  assert.equal(saved.matter.filing.countyReference, "SCC-42");
  assert.equal(saved.matter.filing.countyFeePaidCents, 5010);
  assert.equal(saved.matter.filing.countyFeePaidAt, "2026-10-13T00:00:00.000Z");
  assert.equal(saved.matter.filing.countyFeeReceipt, "FEE-42");
  assert.equal(saved.matter.countyConfirmedAt, undefined);
  assert.equal(chargeReady(saved.matter), false);

  const real = recordCountyConfirmation(
    { filing: { id: "file_9", filedAt: "2026-10-13T18:00:00.000Z", simulated: false }, chargeStatus: "card_saved" },
    { confirmedOn: "2026-10-14T15:00:00.000Z", countyReference: "AAB-9", countyFeePaid: "50.5", countyFeePaidOn: "2026-10-14T12:00:00.000Z", countyFeeReceipt: "AAB-FEE-9" }
  );
  assert.equal(real.ok, true);
  assert.equal(real.matter.filing.countyConfirmedAt, "2026-10-14T15:00:00.000Z");
  assert.equal(real.matter.filing.countyReference, "AAB-9");
  assert.equal(real.matter.filing.countyFeePaidCents, 5050);
  assert.equal(real.matter.filing.countyFeePaidAt, "2026-10-14T12:00:00.000Z");
  assert.equal(real.matter.filing.countyFeeReceipt, "AAB-FEE-9");
  assert.equal(chargeReady(real.matter), true);
  assert.equal(chargeReady({ filing: { ...real.matter.filing, simulated: true } }), false);
  assert.equal(countyFeeUncaptured(real.matter), true);
  assert.equal(countyFeeUncaptured({ ...real.matter, chargeStatus: "failed" }), true);
  assert.equal(countyFeeUncaptured({ ...real.matter, chargeStatus: undefined }), true);
  assert.equal(countyFeeUncaptured({ ...real.matter, chargeStatus: "succeeded" }), false);
  assert.equal(countyFeeUncaptured({
    ...real.matter,
    chargeStatus: "card_saved",
    filing: { ...real.matter.filing, countyFeePaidCents: 0 }
  }), false);

  const admin = read("js/pages/admin.js");
  assert.match(admin, /Record county confirmation/);
  assert.match(admin, /recordCountyConfirmation/);
  assert.match(admin, /filing\.countyFeePaidCents/);
  assert.match(admin, /filing\.countyFeePaidAt/);
  assert.match(admin, /filing\.countyFeeReceipt/);
  assert.match(admin, /name="countyFeePaid"/);
  assert.match(admin, /name="countyFeePaidOn"/);
  assert.match(admin, /name="countyFeeReceipt"/);
  assert.match(admin, /County fee paid\. The card charge failed\./);
  assert.match(admin, /County fee paid\. The card charge is not yet captured\./);
  const chargeHandler = admin.slice(admin.indexOf('"[data-charge]"'), admin.indexOf('"[data-confirm]"'));
  assert.ok(chargeHandler.length > 0);
  assert.equal(chargeHandler.includes("countyConfirmedAt"), false);
  assert.equal(chargeHandler.includes("recordCountyConfirmation"), false);
  assert.equal(chargeHandler.includes("countyFeePaidCents"), false);
});
