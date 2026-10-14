import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargeReady, recordCountyConfirmation } from "./chargeGate.js";
import { CONFIG } from "./config.js";
import { purchaseOffer } from "./offer.js";
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
});

test("ops records a county confirmation, and a simulated filing still cannot be charged", () => {
  assert.equal(recordCountyConfirmation({}, { confirmedOn: "2026-10-14", countyReference: "SCC-1" }).ok, false);
  const missingDate = { filing: { id: "file_1", filedAt: "2026-10-13T18:00:00.000Z", simulated: false } };
  assert.equal(recordCountyConfirmation(missingDate, { confirmedOn: "", countyReference: "SCC-1" }).ok, false);
  assert.equal(recordCountyConfirmation(missingDate, { confirmedOn: "2026-10-14", countyReference: " [pending] " }).ok, false);
  assert.equal(missingDate.filing.countyConfirmedAt, undefined);

  const simulated = { filing: { id: "file_1", filedAt: "2026-10-13T18:00:00.000Z", simulated: true } };
  const saved = recordCountyConfirmation(simulated, { confirmedOn: "2026-10-14", countyReference: " SCC-42 " });
  assert.equal(saved.ok, true);
  assert.equal(saved.matter.filing.countyConfirmedAt, "2026-10-14T00:00:00.000Z");
  assert.equal(saved.matter.filing.countyReference, "SCC-42");
  assert.equal(saved.matter.countyConfirmedAt, undefined);
  assert.equal(chargeReady(saved.matter), false);

  const real = recordCountyConfirmation(
    { filing: { id: "file_9", filedAt: "2026-10-13T18:00:00.000Z", simulated: false } },
    { confirmedOn: "2026-10-14T15:00:00.000Z", countyReference: "AAB-9" }
  );
  assert.equal(real.ok, true);
  assert.equal(real.matter.filing.countyConfirmedAt, "2026-10-14T15:00:00.000Z");
  assert.equal(real.matter.filing.countyReference, "AAB-9");
  assert.equal(chargeReady(real.matter), true);
  assert.equal(chargeReady({ filing: { ...real.matter.filing, simulated: true } }), false);

  const admin = read("js/pages/admin.js");
  assert.match(admin, /Record county confirmation/);
  assert.match(admin, /recordCountyConfirmation/);
  const chargeHandler = admin.slice(admin.indexOf('"[data-charge]"'), admin.indexOf('"[data-confirm]"'));
  assert.ok(chargeHandler.length > 0);
  assert.equal(chargeHandler.includes("countyConfirmedAt"), false);
  assert.equal(chargeHandler.includes("recordCountyConfirmation"), false);
});
