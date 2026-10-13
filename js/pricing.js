/* Prices already published on this site. They sit inside the ranges
   suggested in the October 2026 build brief. County filing fees are not
   included; those come from the county adapter. */
export const PLANS = [
  {
    id: "diy",
    name: "DIY appeal kit",
    price: 79,
    dueToday: 79,
    filesAsAgent: false,
    summary: "Comparable-sales method, value opinion from your numbers, Statement of Facts preview, and the filing checklist from your county adapter. You file."
  },
  {
    id: "dfy",
    name: "Done-for-you filing",
    price: 249,
    dueToday: 249,
    filesAsAgent: true,
    summary: "Everything in the kit. Sherwood files as your authorized agent after you e-sign. You sign the perjury certification yourself."
  },
  {
    id: "contingency",
    name: "Contingency",
    price: null,
    rate: 0.35,
    dueToday: 0,
    filesAsAgent: true,
    summary: "Done-for-you filing. 35% of first-year savings if the assessment is reduced. If there is no reduction, you owe no Sherwood fee. Nothing is charged today."
  }
];

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
  return PLANS.find(p => p.id === id) || null;
}
