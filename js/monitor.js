import { backendEnabled, functionsUrl } from "./config.js";
import { uid } from "./format.js";
import { retainUntil, shiftYears } from "./retention.js";
import { DISCLOSURES_URL } from "./statutoryDisclosure.js";
import { updateDb, loadDb } from "./store.js";

export const MONITOR_TERMS = "The annual monitor costs $49 and renews automatically each year until you cancel. You can cancel online in one click before the renewal date. Sherwood emails a renewal notice 15 to 45 days before the renewal.";

export function confirmationBody(record) {
  const link = `cancel.html?token=${encodeURIComponent(record.cancelToken)}`;
  return [
    "Annual monitor confirmation",
    "",
    record.includedWithFiling && !record.yearStartedAt
      ? "The free monitor year starts when the filing charge is captured. A declined or never-filed case does not get that year."
        + (record.renewal === true ? " After a captured charge, it renews at $49 a year." : " Renewal stays off unless you opt in.")
      : record.includedWithFiling
        ? "Your first year of monitoring is included."
          + (record.renewal === true ? " It renews at $49 a year." : " Renewal is off.")
        : "You agreed to the annual monitor at $49 a year.",
    MONITOR_TERMS,
    "This confirmation is yours to keep.",
    `Cancel online: ${link}`,
    `Disclosures: ${DISCLOSURES_URL}`
  ].join("\n");
}

export function monitorOfferHtml({ email, enrolled, cancelToken }) {
  if (enrolled) {
    const href = `cancel.html?token=${encodeURIComponent(cancelToken || "")}`;
    return `<p>The annual monitor is on. The consent record is kept for 3 years.</p><p><a href="${href}">Cancel the annual monitor</a></p>`;
  }
  return `
    <form id="monitor-form" class="wide">
      <p>${MONITOR_TERMS}</p>
      <p>Nothing is charged today. The $49 renewal is charged only if the monitor is still on at the renewal date. Cancel before that date and the renewal is not charged.</p>
      <label class="check"><input type="checkbox" name="renewalConsent"> I agree to these automatic renewal terms.</label>
      <label>Email<input name="email" type="email" required value="${escapeAttr(email || "")}" autocomplete="email"></label>
      <button class="btn" type="submit">Start the annual monitor</button>
      <p class="err" id="monitor-consent-err" hidden>Check the renewal terms to continue.</p>
    </form>`;
}

function escapeAttr(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

export function enrollMonitor({ email, matterId, userId, setupIntentId, includedWithFiling, renewal }) {
  const now = new Date().toISOString();
  const renews = renewal === true;
  const included = includedWithFiling === true;
  const record = {
    id: uid("mon"),
    email: String(email || "").trim(),
    matterId: matterId || null,
    userId: userId || null,
    price: 49,
    dueToday: 0,
    includedWithFiling: included,
    renewal: renews,
    interval: "year",
    terms: MONITOR_TERMS,
    consented: true,
    consentedAt: now,
    retainUntil: retainUntil(now),
    yearStartedAt: null,
    renewsOn: included || !renews ? null : shiftYears(now, 1).slice(0, 10),
    status: included ? "pending_capture" : "active",
    cancelToken: uid("cancel"),
    setupIntentId: setupIntentId || null,
    chargeStatus: "card_saved",
    paymentId: null,
    paidAt: null,
    renewalNoticeSent: false
  };
  updateDb(db => {
    db.monitors = db.monitors || [];
    db.monitors.push(record);
  });
  return record;
}

/* The free year starts at capture, not when the card is saved. */
export function startIncludedYear(record, capturedAt) {
  if (!record || record.includedWithFiling !== true || record.status === "canceled") return record;
  if (!capturedAt) return record;
  record.yearStartedAt = capturedAt;
  record.renewsOn = record.renewal === true ? shiftYears(capturedAt, 1).slice(0, 10) : null;
  record.status = "active";
  return record;
}

export function cancelMonitorLocal(token) {
  let found = null;
  updateDb(db => {
    const row = (db.monitors || []).find(item => item.cancelToken === token && item.status === "active");
    if (!row) return;
    row.status = "canceled";
    row.canceledAt = new Date().toISOString();
    found = { ...row };
  });
  return found;
}

export function monitorByToken(token) {
  const db = loadDb();
  return (db.monitors || []).find(item => item.cancelToken === token) || null;
}

export async function createMonitorRemote(record) {
  if (!backendEnabled()) return { ok: true, simulated: true, email_sent: false };
  try {
    const res = await fetch(functionsUrl("createMonitor"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: record.email,
        renewal_consent: record.renewal === true
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "Request failed." };
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: "Network error." };
  }
}

export async function cancelMonitorRemote(token) {
  if (!backendEnabled() || !token) return { ok: true, simulated: true };
  try {
    const res = await fetch(`${functionsUrl("cancelMonitor")}?token=${encodeURIComponent(token)}`);
    return { ok: res.ok };
  } catch (e) {
    return { ok: false };
  }
}
