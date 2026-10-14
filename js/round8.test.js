import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargeReady, chargeSavedCardIfReady, recordCountyConfirmation } from "./chargeGate.js";
import { DIY_HOLD_NOTE } from "./pricing.js";
import { ORDER_CUTOFF_LEAD_DAYS, orderCutoffIso, purchaseOffer } from "./offer.js";
import { CONFIG } from "./config.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readCounty = (name) => JSON.parse(readFileSync(new URL(`../data/counties/${name}.json`, import.meta.url), "utf8"));

const readyMatter = {
  id: "m1",
  planId: "dfy",
  userId: "u1",
  setupIntentId: "seti_1",
  chargeStatus: "card_saved",
  filing: {
    id: "file_1",
    filedAt: "2026-10-13T18:00:00.000Z",
    simulated: false,
    countyConfirmedAt: "2026-10-14T15:00:00.000Z",
    countyReference: "AAB-100"
  }
};

test("the charge button waits for a filing and a county confirmation it does not create", async () => {
  assert.equal(chargeReady(readyMatter), true);
  assert.equal(chargeReady({ ...readyMatter, filing: { ...readyMatter.filing, simulated: true } }), false);
  assert.equal(chargeReady({ ...readyMatter, filing: { id: "file_1", simulated: false } }), false);
  assert.equal(chargeReady({ ...readyMatter, filing: { filedAt: readyMatter.filing.filedAt, simulated: false } }), false);
  assert.equal(chargeReady({ ...readyMatter, filing: { ...readyMatter.filing, countyConfirmedAt: undefined } }), false);
  assert.equal(chargeReady({ ...readyMatter, filing: { ...readyMatter.filing, countyConfirmedAt: "[pending]" } }), false);
  assert.equal(chargeReady({ ...readyMatter, filing: { ...readyMatter.filing, countyConfirmedAt: "not a time" } }), false);
  let calls = 0;
  const skipped = await chargeSavedCardIfReady({ ...readyMatter, filing: { ...readyMatter.filing, countyConfirmedAt: "" } }, () => {
    calls += 1;
    return { status: "succeeded" };
  });
  assert.equal(skipped, null);
  assert.equal(calls, 0);
  const charged = await chargeSavedCardIfReady(readyMatter, () => {
    calls += 1;
    return { status: "succeeded", id: "ch_1" };
  });
  assert.equal(charged.status, "succeeded");
  assert.equal(calls, 1);
  const admin = read("js/pages/admin.js");
  const chargeHandler = admin.slice(admin.indexOf('"[data-charge]"'), admin.indexOf('"[data-confirm]"'));
  assert.equal(chargeHandler.includes("countyConfirmedAt"), false);
  assert.match(admin, /Record county confirmation/);
  assert.match(admin, /recordCountyConfirmation/);
  const recorded = recordCountyConfirmation(
    { filing: { id: "file_2", filedAt: "2026-10-13T18:00:00.000Z", simulated: true } },
    { confirmedOn: "2026-10-14", countyReference: "SCC-42", countyFeePaid: "0", countyFeePaidOn: "2026-10-14", countyFeeReceipt: "NONE" }
  );
  assert.equal(recorded.ok, true);
  assert.equal(recorded.matter.filing.countyConfirmedAt, "2026-10-14T00:00:00.000Z");
  assert.equal(recorded.matter.filing.countyReference, "SCC-42");
  assert.equal(recorded.matter.filing.countyFeePaidCents, 0);
  assert.equal(chargeReady(recorded.matter), false);
  assert.match(admin, /chargeSavedCardIfReady/);
  assert.equal(read("js/adapters/payments.js").includes("async charge("), false);
  assert.equal(DIY_HOLD_NOTE, "Card saved. Not charged while payment timing is under attorney review.");
});

test("We file it orders close 5 days before the county window, and Santa Cruz stays Nov 25", () => {
  assert.equal(ORDER_CUTOFF_LEAD_DAYS, 5);
  assert.equal(CONFIG.order_cutoff, "2026-11-25");
  assert.equal(orderCutoffIso(readCounty("santa_cruz")), "2026-11-25");
  assert.equal(orderCutoffIso(readCounty("yolo")), "2026-11-25");
  assert.equal(orderCutoffIso(readCounty("alameda")), "2026-09-10");
  assert.equal(orderCutoffIso({ id: "blank", filing: {} }), "");
  const yolo = { ...readCounty("yolo"), status: "verified" };
  const nov25 = new Date(2026, 10, 25, 18, 0, 0);
  const nov26 = new Date(2026, 10, 26, 0, 30, 0);
  assert.equal(purchaseOffer(yolo, nov25).dfy, true);
  assert.equal(purchaseOffer(yolo, nov26).dfy, false);
  assert.equal(purchaseOffer(yolo, nov26).diy, false);
});
