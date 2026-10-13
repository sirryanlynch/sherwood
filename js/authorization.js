import { formatShortDay, parseISODate } from "./format.js";

/* Shown on the agent authorization. Not a verified office address. */
export const AGENT_CONTACT = Object.freeze({
  name: "[pending]",
  address: "[pending]",
  phone: "[pending]"
});

export const OWNER_COPY_LINE = "You get a copy of everything filed.";

export function filingYear(county) {
  const filing = county && county.filing;
  const raw = filing && ((filing.regular_window && filing.regular_window.end) || filing.current_year_deadline);
  const parsed = parseISODate(raw);
  return parsed ? parsed.getFullYear() : null;
}

/* The filing year and earlier years, four at most. No year after today. */
export function taxYearChoices(county, today) {
  const day = today instanceof Date ? today : new Date();
  const listed = filingYear(county);
  const cap = listed == null ? day.getFullYear() : Math.min(listed, day.getFullYear());
  const years = [];
  for (let i = 0; i < 4; i++) years.push(cap - i);
  return years;
}

export function parcelLabel(matter) {
  const intake = matter && matter.intake;
  const address = (matter && matter.address) || (intake && intake.address) || "";
  const place = address || "Address not entered";
  const apn = intake && String(intake.apn || "").trim();
  return apn ? `${place}, APN ${apn}` : `${place}, APN not entered`;
}

export function normalizeTaxYears(selected, choices) {
  const allowed = new Set(choices);
  const years = [];
  for (const value of selected || []) {
    const year = Number(value);
    if (!allowed.has(year) || years.includes(year)) continue;
    years.push(year);
    if (years.length === 4) break;
  }
  return years.sort((a, b) => b - a);
}

export function signedDateText(iso) {
  const shown = formatShortDay(iso);
  if (!iso || shown === "not set") return "";
  return shown;
}

/* Rule 305 fields the product stores. Agent contact may be the pending placeholders. */
export function authorizationReady(auth) {
  if (!auth || !auth.signedAt || !String(auth.signerName || "").trim()) return false;
  if (!String(auth.signerTitle || "").trim()) return false;
  if (!String(auth.parcel || "").trim()) return false;
  if (!auth.ownerGetsCopy) return false;
  if (!String(auth.agentName || "").trim() || !String(auth.agentAddress || "").trim() || !String(auth.agentPhone || "").trim()) return false;
  const years = Array.isArray(auth.taxYears) ? auth.taxYears : [];
  if (!years.length || years.length > 4) return false;
  return true;
}

export function signedBeforeFiling(auth, filedAt) {
  if (!authorizationReady(auth) || !filedAt) return false;
  const signed = Date.parse(auth.signedAt);
  const filed = Date.parse(filedAt);
  if (!Number.isFinite(signed) || !Number.isFinite(filed)) return false;
  return signed <= filed;
}
