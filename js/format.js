export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

export function money(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "not set";
  return Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function moneyToNumber(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseISODate(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function asDate(value) {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const parsed = parseISODate(value);
  return parsed || new Date(value);
}

export function isoDay(date) {
  const d = asDate(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDay(value) {
  const d = parseISODate(value) || (value instanceof Date ? value : null);
  if (!d) return "not set";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function uid(prefix) {
  const rnd = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
  return `${prefix}_${rnd}`;
}

export function contactLine(contact) {
  if (!contact) return "Not in this adapter.";
  const parts = [contact.phone, contact.email, contact.address].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Not in this adapter.";
}
