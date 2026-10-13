import { updateDb } from "../store.js";
import { uid } from "../format.js";

/* Real Stripe replaces charge(). Card numbers are never accepted. */
export const paymentsAdapter = {
  name: "simulated-stripe",
  async charge({ userId, matterId, plan, amount }) {
    const payment = {
      id: uid("pay"),
      provider: "stripe",
      simulated: true,
      userId,
      matterId,
      planId: plan.id,
      amount,
      currency: "USD",
      status: "succeeded",
      createdAt: new Date().toISOString()
    };
    updateDb(db => { db.payments.push(payment); });
    return payment;
  }
};
