/* Prices already published on this site. They sit inside the ranges
   suggested in the October 2026 build brief. County filing fees are not
   included; those come from the county adapter. */
/* Checkout offers these two only. Contingency is not a checkout plan. */
export const CHECKOUT_PLANS = [
  {
    id: "diy",
    name: "DIY kit",
    price: 79,
    dueToday: 79,
    filesAsAgent: false,
    summary: "Comparable-sales method, value opinion from your numbers, Statement of Facts preview, and the filing checklist from your county adapter. You file."
  },
  {
    id: "dfy",
    name: "We file it",
    price: 249,
    dueToday: 249,
    filesAsAgent: true,
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
