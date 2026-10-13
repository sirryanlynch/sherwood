export const RETENTION_YEARS = 3;
export const AUTHORIZATION_RETENTION = "Signed agent authorizations are kept 3 years.";

export function shiftYears(iso, years) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const out = new Date(d.getTime());
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out.toISOString();
}

export function retainUntil(iso) {
  return shiftYears(iso, RETENTION_YEARS);
}
