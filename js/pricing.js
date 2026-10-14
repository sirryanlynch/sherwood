import { CONFIG } from "./config.js";

/* Checkout offers these two only. Contingency is not a checkout plan.
   County filing fees come from filing.filing_fee on the county adapter.
   SHOW_199_PLUS_COUNTY_FEE stays off until counsel clears that display.
   Neither plan charges at checkout. */
export const CARD_SAVE_NOTE = "We'll save your card today. You won't be charged until the county confirms your appeal is filed.";
export const DIY_HOLD_NOTE = "Card saved. Not charged while payment timing is under attorney review.";

export const DFY_INCLUDED_AMOUNT = 249;
export const DFY_PLUS_FEE_AMOUNT = 199;

export function dfyServiceAmount() {
  return CONFIG.SHOW_199_PLUS_COUNTY_FEE === true ? DFY_PLUS_FEE_AMOUNT : DFY_INCLUDED_AMOUNT;
}

export const CHECKOUT_PLANS = [
  {
    id: "diy",
    name: "DIY kit",
    price: 79,
    dueToday: 0,
    filesAsAgent: false,
    timingFlag: "[DRAFT – payment timing pending attorney review]",
    chargeNote: DIY_HOLD_NOTE,
    summary: "Comparable-sales method, value opinion from your numbers, Statement of Facts preview, and the filing checklist from your county adapter. You file."
  },
  {
    id: "dfy",
    name: "We file it",
    price: dfyServiceAmount(),
    dueToday: 0,
    filesAsAgent: true,
    chargeNote: CARD_SAVE_NOTE,
    summary: "Everything in the kit. The named agent signs filings only, after you sign this county's agent authorization. You sign the perjury certification yourself."
  }
];

export const PLANS = CHECKOUT_PLANS;

/* Not sold at checkout. Kept so an older matter id still resolves. */
export const CONTINGENCY = {
  id: "contingency",
  name: "Contingency",
  price: null,
  rate: 0.35,
  dueToday: 0,
  filesAsAgent: true,
  checkout: false,
  summary: "Coming soon, pending review. Not offered at checkout."
};

export const HEARING_STATEMENT = "We prepare your evidence, file your appeal, and work toward an informal reduction or settlement with the Assessor. If your case goes to a hearing, you attend (in person or by video where the county allows) using a hearing packet we prepare. If no one attends, the board will deny the appeal.";

/* Shown for We file it. Unchecked until the customer checks it. */
export function hearingAckState(planId) {
  const dfy = planId === "dfy";
  return { visible: dfy, required: dfy, checked: false };
}

export function hearingAckHtml(planId) {
  const state = hearingAckState(planId);
  const hidden = state.visible ? "" : " hidden";
  const required = state.required ? " required" : "";
  return `<label class="check" id="hearing-ack"${hidden}><input type="checkbox" name="hearingAck" data-hearing-ack${required}> ${HEARING_STATEMENT}</label>`;
}

export const MONITOR = {
  id: "monitor",
  name: "Annual monitor",
  price: 49,
  dueToday: 0,
  interval: "year",
  summary: "We re-check your value every year and tell you when filing again makes sense."
};

export function planById(id) {
  if (id === CONTINGENCY.id) return CONTINGENCY;
  return CHECKOUT_PLANS.find(p => p.id === id) || null;
}

/* Positive filing_fee only. Zero and missing mean: do not mention a county fee. */
export function filingFeeAmount(county) {
  const raw = county && county.filing ? county.filing.filing_fee : undefined;
  const amount = typeof raw === "number" ? raw : raw && raw.amount;
  if (typeof amount !== "number" || amount <= 0) return null;
  return amount;
}

export function filingFeeNote(county) {
  const raw = county && county.filing ? county.filing.filing_fee : undefined;
  if (!raw || typeof raw !== "object") return "";
  return typeof raw.note === "string" ? raw.note : "";
}

export function plainDollars(amount) {
  if (typeof amount !== "number") return "";
  if (Number.isInteger(amount)) return `$${amount}`;
  return `$${amount.toFixed(2)}`;
}

export function adapterFeeNotes(county) {
  const filing = county && county.filing;
  if (!filing) return [];
  const notes = [];
  const surcharge = filing.efile_fee && filing.efile_fee.surcharge;
  if (typeof surcharge === "number" && surcharge > 0) {
    notes.push(`Online payment surcharge on this adapter: ${plainDollars(surcharge)}.`);
  }
  if (filing.cutoff_time) notes.push(`Filing cutoff on this adapter: ${filing.cutoff_time}.`);
  if (filing.postmark_ok === true) notes.push("This adapter says a postmark can count.");
  return notes;
}

export function planPriceLines(county) {
  const fee = filingFeeAmount(county);
  const service = dfyServiceAmount();
  const diyFee = fee == null ? "" : `+ ${plainDollars(fee)} county fee, paid when you file.`;
  const diyLine = fee == null ? "$79" : `$79 + ${plainDollars(fee)} county fee, paid when you file`;
  let dfy;
  if (CONFIG.SHOW_199_PLUS_COUNTY_FEE === true) {
    dfy = fee == null ? "$199 + county fee" : `$199 + ${plainDollars(fee)} county fee`;
  } else if (fee == null) {
    dfy = `$${service}`;
  } else {
    dfy = `$${service}, county fee included.`;
  }
  const home = fee == null
    ? `Check for free. If there's a case, file it yourself for $79, or we'll file it for you for ${dfy}`
    : `Check for free. If there's a case, file it yourself for $79 + ${plainDollars(fee)} county fee, paid when you file, or we'll file it for you for ${dfy}`;
  return { fee, diy: "$79", diyFee, diyLine, dfy, home, feeNote: filingFeeNote(county), service };
}

/* Unlisted landings show the same $249 total as Santa Cruz while SHOW_199_PLUS_COUNTY_FEE is off.
   A missing or zero county fee is a plain total, with no fee line. A positive fee says it is included. */
export function landingHomeLine(county) {
  const home = planPriceLines(county).home;
  return home.endsWith(".") ? home : `${home}.`;
}
