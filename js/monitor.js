import { backendEnabled, functionsUrl } from "./config.js";
import { uid } from "./format.js";
import { CARD_SAVE_NOTE } from "./pricing.js";
import { retainUntil, shiftYears } from "./retention.js";
import { STATUTORY_DISCLOSURE } from "./statutoryDisclosure.js";
import { updateDb, loadDb } from "./store.js";

export const MONITOR_TERMS = "The annual monitor costs $49 and renews automatically each year until you cancel. You can cancel online in one click before the renewal date. Sherwood emails a renewal notice 15 to 45 days before the renewal.";

export function confirmationBody(record) {
  const link = `cancel.html?token=${encodeURIComponent(record.cancelToken)}`;
  return [
    STATUTORY_DISCLOSURE,
    "",
    "Annual monitor confirmation",
    "",
    "You agreed to the annual monitor at $49 a year.",
    MONITOR_TERMS,
    "This confirmation is yours to keep.",
    `Cancel online: ${link}`
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
      <p>${CARD_SAVE_NOTE}</p>
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

export function enrollMonitor({ email, matterId, userId, setupIntentId }) {
  const now = new Date().toISOString();
  const record = {
    id: uid("mon"),
    email: String(email || "").trim(),
    matterId: matterId || null,
    userId: userId || null,
    price: 49,
    dueToday: 0,
    interval: "year",
    terms: MONITOR_TERMS,
    consented: true,
    consentedAt: now,
    retainUntil: retainUntil(now),
    renewsOn: shiftYears(now, 1).slice(0, 10),
    cancelToken: uid("cancel"),
    setupIntentId: setupIntentId || null,
    chargeStatus: "card_saved",
    paymentId: null,
    paidAt: null,
    status: "active",
    renewalNoticeSent: false
  };
  updateDb(db => {
    db.monitors = db.monitors || [];
    db.monitors.push(record);
  });
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
        renewal_consent: true
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
