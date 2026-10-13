import { money } from "./format.js";

export function shortExplanation(matter, county) {
  const text = `Opinion ${money(matter.market)} vs assessed ${money(matter.assessed)}; see attached statement.`;
  const limit = county.filing && county.filing.explanation_chars;
  if (typeof limit === "number") return { text: text.slice(0, limit), limit };
  return { text, limit: null };
}

export function statementOfFacts(matter, county) {
  const intake = matter.intake || {};
  const lines = [
    "Statement of Facts — preview. Not filed. Not legal advice.",
    `County adapter: ${county.county} (${county.status_label}).`,
    `Property: ${matter.address || "not entered"}`,
    `APN: ${intake.apn || "not entered"}`,
    `Assessed value entered: ${money(matter.assessed)}`,
    `Opinion of market value entered: ${money(matter.market)}`,
    `Difference: ${money(matter.reduction)}`,
    county.valuation && county.valuation.note ? `Valuation note from the adapter: ${county.valuation.note}` : "",
    "Comparable sales: none attached. This demo does not invent sales. A live kit needs MLS or a licensed data source. The published pilot is the case study, and it is not this property unless you say it is.",
    `Condition, as you entered it: roof age ${intake.roofAge || "not set"}; damage: ${intake.damage || "none entered"}; remodels: ${intake.remodels || "none entered"}; systems: ${intake.systems || "none entered"}.`,
    `Owner-occupied, as entered: ${intake.ownerOccupied || "not set"}.`,
    "The homeowner reviews this page and signs the certification. Sherwood does not sign it."
  ];
  return lines.filter(Boolean).join("\n\n");
}
