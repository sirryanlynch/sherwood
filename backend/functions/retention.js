const RETENTION_YEARS = 3;
const AUTHORIZATION_RETENTION = "Signed agent authorizations are kept 3 years.";

function shiftYears(iso, years) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const out = new Date(d.getTime());
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out.toISOString();
}

function retainUntil(iso) {
  return shiftYears(iso, RETENTION_YEARS);
}

function renewsOn(iso) {
  return shiftYears(iso, 1).slice(0, 10);
}

module.exports = { RETENTION_YEARS, AUTHORIZATION_RETENTION, shiftYears, retainUntil, renewsOn };
