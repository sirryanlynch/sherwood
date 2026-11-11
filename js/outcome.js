/* Customer-facing names. The engine still stores go, borderline, no_go, and off_season. */
export function customerOutcome(outcome) {
  if (outcome === "no_go") {
    return { id: "no_action", label: "No action recommended", title: "No action recommended." };
  }
  if (outcome === "go") {
    return { id: "go", label: "You likely have a case", title: "You likely have a case." };
  }
  if (outcome === "borderline") {
    return { id: "borderline", label: "It's close", title: "It's close. A person will review it." };
  }
  if (outcome === "off_season") {
    return { id: "off_season", label: "Filing opens later", title: "Filing is closed for this season." };
  }
  return { id: String(outcome || "check"), label: "Your check", title: "Your check" };
}

export const VALUE_VS_RATE = [
  ["Market value", "What the home might sell for. You type this estimate. This check does not pull comparable sales."],
  ["Assessed value", "The value on the assessment roll. An appeal asks the county to review this number."],
  ["Taxable value", "The assessed value after exemptions the county has already applied. It is not the same as the market estimate."],
  ["Tax bill", "Taxable value times the tax rate, plus voter-approved charges. A higher bill by itself is not an appeal."]
];

export const WE_DO = [
  "We gather your numbers, your property details, and a Statement of Facts from what you enter.",
  "We fill the county forms. You review them before anything is signed.",
  "Our named agent files once you sign the county's agent authorization. You get the filing confirmation.",
  "We prepare a hearing packet. Sherwood does not represent you at the hearing."
];

export const YOU_DO = [
  "You review and sign.",
  "You attend the hearing, or the appeal is denied.",
  "You decide whether to accept a settlement.",
  "You keep paying the tax bill. Filing does not pause it."
];
