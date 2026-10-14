/* The charge button does not create a county confirmation. A simulated filing
   cannot be charged. The confirmation date and county reference are recorded
   by the ops action onto the filing. */

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

/* Ops records the county's own confirmation. This does not charge the card. */
export function recordCountyConfirmation(matter, { confirmedOn, countyReference } = {}) {
  const filing = matter && matter.filing;
  if (!filing) return { ok: false, reason: "No filing on this appeal." };
  const reference = String(countyReference ?? "").trim();
  if (!reference || reference === "[pending]") return { ok: false, reason: "County reference is required." };
  const iso = confirmationIso(confirmedOn);
  if (!iso) return { ok: false, reason: "Confirmation date is required." };
  filing.countyConfirmedAt = iso;
  filing.countyReference = reference;
  return { ok: true, matter };
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
