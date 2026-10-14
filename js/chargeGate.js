/* The charge button does not create a county confirmation. A simulated filing
   cannot be charged. The confirmation date, county reference, and county fee
   payment are recorded by the ops action onto the filing. */

export function chargeReady(matter) {
  const filing = matter && matter.filing;
  if (!filing) return false;
  if (filing.simulated === true) return false;
  if (!Number.isFinite(Date.parse(filing.filedAt))) return false;
  if (!String(filing.id || "").trim()) return false;
  const confirmed = filing.countyConfirmedAt;
  if (typeof confirmed !== "string" || !confirmed.trim() || confirmed.trim() === "[pending]") return false;
  return Number.isFinite(Date.parse(confirmed));
}

/* Ops records the county's own confirmation and the fee the county was paid.
   This does not charge the card. Invalid input writes nothing. */
export function recordCountyConfirmation(matter, {
  confirmedOn,
  countyReference,
  countyFeePaid,
  countyFeePaidOn,
  countyFeeReceipt
} = {}) {
  const filing = matter && matter.filing;
  if (!filing) return { ok: false, reason: "No filing on this appeal." };
  const reference = String(countyReference ?? "").trim();
  if (!reference || reference === "[pending]") return { ok: false, reason: "County reference is required." };
  const iso = confirmationIso(confirmedOn);
  if (!iso) return { ok: false, reason: "Confirmation date is required." };
  const cents = countyFeeCents(countyFeePaid);
  if (cents == null) return { ok: false, reason: "County fee paid is required." };
  const paidAt = confirmationIso(countyFeePaidOn);
  if (!paidAt) return { ok: false, reason: "County fee paid date is required." };
  const receipt = String(countyFeeReceipt ?? "").trim();
  if (!receipt || receipt === "[pending]") return { ok: false, reason: "County fee receipt is required." };
  filing.countyConfirmedAt = iso;
  filing.countyReference = reference;
  filing.countyFeePaidCents = cents;
  filing.countyFeePaidAt = paidAt;
  filing.countyFeeReceipt = receipt;
  return { ok: true, matter };
}

/* Dollars as text or number, stored as integer cents. Rejects blanks, negatives, and extra decimals. */
function countyFeeCents(value) {
  const text = String(value ?? "").trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

/* True when a positive county fee is on the filing and the card is not captured. */
export function countyFeeUncaptured(matter) {
  const filing = matter && matter.filing;
  if (!filing) return false;
  const cents = filing.countyFeePaidCents;
  if (!Number.isInteger(cents) || cents <= 0) return false;
  const paidAt = filing.countyFeePaidAt;
  if (typeof paidAt !== "string" || !Number.isFinite(Date.parse(paidAt))) return false;
  return matter.chargeStatus !== "succeeded";
}

function confirmationIso(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "[pending]") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

/* Re-check immediately before the charge. Returns null when the appeal is not ready. */
export async function chargeSavedCardIfReady(matter, charge) {
  if (!matter || matter.chargeStatus === "succeeded") return null;
  if (!chargeReady(matter)) return null;
  return charge(matter);
}
