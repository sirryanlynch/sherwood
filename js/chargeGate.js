/* The charge button does not create a county confirmation. All three have to
   already be on the appeal: a filing time, a filing ID, and countyConfirmedAt. */

export function chargeReady(matter) {
  const filing = matter && matter.filing;
  if (!filing) return false;
  if (!Number.isFinite(Date.parse(filing.filedAt))) return false;
  if (!String(filing.id || "").trim()) return false;
  const confirmed = matter.countyConfirmedAt;
  if (typeof confirmed !== "string" || !confirmed.trim() || confirmed.trim() === "[pending]") return false;
  return Number.isFinite(Date.parse(confirmed));
}

/* Re-check immediately before the charge. Returns null when the appeal is not ready. */
export async function chargeSavedCardIfReady(matter, charge) {
  if (!matter || matter.chargeStatus === "succeeded") return null;
  if (!chargeReady(matter)) return null;
  return charge(matter);
}
