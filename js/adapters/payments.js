import { readAttribution } from "../attribution.js";
import { updateDb } from "../store.js";
import { uid } from "../format.js";

/* Real Stripe replaces saveCard() and chargeSavedCard(). Card numbers are never accepted. */
export const paymentsAdapter = {
  name: "simulated-stripe",
  async saveCard({ userId, matterId, plan, attribution }) {
    const touch = attribution || readAttribution();
    const setup = {
      id: uid("seti"),
      provider: "stripe",
      object: "setup_intent",
      simulated: true,
      userId,
      matterId,
      planId: plan.id,
      amount: 0,
      currency: "USD",
      status: "card_saved",
      usage: "off_session",
      createdAt: new Date().toISOString(),
      src: touch && touch.src || null,
      attribution: touch || null
    };
    updateDb(db => { db.payments.push(setup); });
    return setup;
  },
  async chargeSavedCard({ userId, matterId, setupIntentId, amount, fail, attribution }) {
    const touch = attribution || readAttribution();
    const createdAt = new Date().toISOString();
    let setup = null;
    updateDb(db => {
      setup = db.payments.find(item => item.id === setupIntentId && item.object === "setup_intent") || null;
    });
    if (!setup || (setup.status !== "card_saved" && setup.status !== "succeeded")) {
      const missed = {
        id: uid("ch"),
        provider: "stripe",
        object: "charge",
        simulated: true,
        userId,
        matterId,
        setupIntentId: setupIntentId || null,
        amount,
        currency: "USD",
        status: "failed",
        reason: "No saved card.",
        createdAt,
        src: touch && touch.src || null,
        attribution: touch || null
      };
      updateDb(db => { db.payments.push(missed); });
      return missed;
    }
    const charge = {
      id: uid("ch"),
      provider: "stripe",
      object: "charge",
      simulated: true,
      userId,
      matterId,
      setupIntentId,
      amount,
      currency: "USD",
      status: fail ? "failed" : "succeeded",
      reason: fail ? "The simulated charge was declined." : "",
      createdAt,
      src: touch && touch.src || null,
      attribution: touch || null
    };
    updateDb(db => { db.payments.push(charge); });
    return charge;
  },
  async charge({ userId, matterId, plan, amount, attribution }) {
    const touch = attribution || readAttribution();
    const payment = {
      id: uid("pay"),
      provider: "stripe",
      object: "charge",
      simulated: true,
      userId,
      matterId,
      planId: plan && plan.id,
      amount,
      currency: "USD",
      status: "succeeded",
      createdAt: new Date().toISOString(),
      src: touch && touch.src || null,
      attribution: touch || null
    };
    updateDb(db => { db.payments.push(payment); });
    return payment;
  }
};
