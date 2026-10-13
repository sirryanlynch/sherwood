const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]{2,64}$/;
const SOURCE_RE = /^[a-z0-9_-]{2,64}$/;

function clean(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body;
}

const SRC_RE = /^[A-Za-z0-9._-]{1,64}$/;
const UTM_KEY_RE = /^utm_[a-z0-9_]{1,24}$/;
const UTM_VAL_RE = /^[A-Za-z0-9._+:/=~-]{1,120}$/;

function cleanAttribution(data) {
  const srcRaw = data.src == null || data.src === "" ? "" : String(data.src).trim();
  const src = SRC_RE.test(srcRaw) ? srcRaw : null;
  const utm = {};
  const raw = data.utm;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const key of Object.keys(raw)) {
      if (Object.keys(utm).length >= 8) break;
      const name = String(key || "").trim().toLowerCase();
      if (!UTM_KEY_RE.test(name)) continue;
      const value = String(raw[key] ?? "").trim();
      if (!UTM_VAL_RE.test(value)) continue;
      utm[name] = value;
    }
  }
  return { src, utm };
}

function validateReminderInput(body) {
  const data = clean(body);
  const errors = [];
  if (!data) return { ok: false, errors: ["Body must be a JSON object."] };
  const email = String(data.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) errors.push("Enter a valid email.");
  let county = data.county_slug == null || data.county_slug === "" ? null : String(data.county_slug).trim().toLowerCase();
  if (county && !SLUG_RE.test(county)) errors.push("County slug is not valid.");
  const address = data.address == null || data.address === "" ? null : String(data.address).trim();
  if (address && address.length > 300) errors.push("Address is too long.");
  if (data.marketing_consent !== true) errors.push("Marketing consent is required.");
  const source = String(data.consent_source || "").trim();
  if (!SOURCE_RE.test(source)) errors.push("Consent source is required.");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { email, county_slug: county, address, marketing_consent: true, consent_source: source, ...cleanAttribution(data) }
  };
}

function validateLeadInput(body) {
  const data = clean(body);
  const errors = [];
  if (!data) return { ok: false, errors: ["Body must be a JSON object."] };
  const email = String(data.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) errors.push("Enter a valid email.");
  let county = data.county_slug == null || data.county_slug === "" ? null : String(data.county_slug).trim().toLowerCase();
  if (county && !SLUG_RE.test(county)) errors.push("County slug is not valid.");
  const address = data.address == null || data.address === "" ? null : String(data.address).trim();
  if (address && address.length > 300) errors.push("Address is too long.");
  const outcome = String(data.outcome || "").trim();
  if (outcome.length > 40) errors.push("Outcome is too long.");
  const source = String(data.consent_source || "results_save").trim();
  if (!SOURCE_RE.test(source)) errors.push("Consent source is required.");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { email, county_slug: county, address, outcome, consent_source: source, ...cleanAttribution(data) } };
}

function validateConvertedInput(body) {
  const data = clean(body);
  if (!data) return { ok: false, errors: ["Body must be a JSON object."] };
  const email = String(data.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, errors: ["Enter a valid email."] };
  let county = data.county_slug == null || data.county_slug === "" ? null : String(data.county_slug).trim().toLowerCase();
  if (county && !SLUG_RE.test(county)) return { ok: false, errors: ["County slug is not valid."] };
  return { ok: true, value: { email, county_slug: county } };
}

function nextRate({ count, windowStartMs, now, limit = 8, windowMs = 60 * 60 * 1000 }) {
  const start = Number(windowStartMs) || 0;
  const used = Number(count) || 0;
  if (!start || now - start >= windowMs) return { allow: true, count: 1, windowStartMs: now };
  if (used >= limit) return { allow: false, count: used, windowStartMs: start };
  return { allow: true, count: used + 1, windowStartMs: start };
}

module.exports = { validateReminderInput, validateLeadInput, validateConvertedInput, nextRate };
