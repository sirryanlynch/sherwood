/* Checkout offers these two only. Contingency is not a checkout plan.
   County filing fees come from filing.filing_fee on the county adapter.
   We file it is $249 with that fee included. The DIY kit is $79, and the
   county fee is extra only when filing_fee's amount is above zero. */
export const CHECKOUT_PLANS = [
  {
    id: "diy",
    name: "DIY kit",
    price: 79,
    dueToday: 79,
    filesAsAgent: false,
    timingFlag: "[DRAFT – payment timing pending attorney review]",
    summary: "Comparable-sales method, value opinion from your numbers, Statement of Facts preview, and the filing checklist from your county adapter. You file."
  },
  {
    id: "dfy",
    name: "We file it",
    price: 249,
    dueToday: 249,
    filesAsAgent: true,
    chargeNote: "You won't be charged until the county confirms your filing.",
    summary: "Everything in the kit. Sherwood files as your authorized agent after you sign this county's agent authorization. You sign the perjury certification yourself."
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

export const HEARING_ADDON = {
  id: "hearing",
  name: "Hearing support",
  price: null,
  summary: "Flat fee, quoted per case. Evidence packet and hearing preparation. Not a checkout price."
};

export const MONITOR = {
  id: "monitor",
  name: "Annual monitor",
  price: 49,
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

export function planPriceLines(county) {
  const fee = filingFeeAmount(county);
  const diyFee = fee == null ? "" : `+ ${plainDollars(fee)} county fee, paid when you file.`;
  const diyLine = fee == null ? "$79" : `$79 + ${plainDollars(fee)} county fee, paid when you file`;
  const dfy = fee == null ? "$249" : "$249, county fee included.";
  const home = fee == null
    ? "Check for free. If there's a case, file it yourself for $79, or we'll file it for you for $249."
    : `Check for free. If there's a case, file it yourself for $79 + ${plainDollars(fee)} county fee, paid when you file, or we'll file it for you for ${dfy}`;
  return { fee, diy: "$79", diyFee, diyLine, dfy, home, feeNote: filingFeeNote(county) };
}
