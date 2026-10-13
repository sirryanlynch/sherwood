/* First-touch visit source. Written once, the first time a landing URL
   includes src or any utm_* parameter. Later visits do not replace it.
   ?county= is not part of this record. */

export const ATTR_KEY = "sherwood_attribution";

const SRC_RE = /^[A-Za-z0-9._-]{1,64}$/;
const UTM_KEY_RE = /^utm_[a-z0-9_]{1,24}$/;
const UTM_VAL_RE = /^[A-Za-z0-9._+:/=~-]{1,120}$/;

export function touchFromSearch(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const srcRaw = String(params.get("src") || "").trim();
  const src = SRC_RE.test(srcRaw) ? srcRaw : null;
  const utm = {};
  for (const [key, value] of params.entries()) {
    const name = String(key || "").trim().toLowerCase();
    if (!UTM_KEY_RE.test(name)) continue;
    if (Object.keys(utm).length >= 8) break;
    const clean = String(value || "").trim();
    if (!UTM_VAL_RE.test(clean)) continue;
    utm[name] = clean;
  }
  return { src, utm };
}

export function readAttribution(storage) {
  const store = storage || globalStorage();
  if (!store) return null;
  try {
    const parsed = JSON.parse(store.getItem(ATTR_KEY) || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const src = typeof parsed.src === "string" && SRC_RE.test(parsed.src) ? parsed.src : null;
    const utm = {};
    if (parsed.utm && typeof parsed.utm === "object" && !Array.isArray(parsed.utm)) {
      for (const [key, value] of Object.entries(parsed.utm)) {
        const name = String(key || "").toLowerCase();
        if (!UTM_KEY_RE.test(name)) continue;
        if (typeof value !== "string" || !UTM_VAL_RE.test(value)) continue;
        utm[name] = value;
      }
    }
    if (!src && !Object.keys(utm).length) return null;
    return { src, utm, capturedAt: typeof parsed.capturedAt === "string" ? parsed.capturedAt : null };
  } catch (e) {
    return null;
  }
}

export function captureFirstTouch(search, storage) {
  const store = storage || globalStorage();
  const existing = readAttribution(store);
  if (existing) return existing;
  const touch = touchFromSearch(search == null ? currentSearch() : search);
  if (!touch.src && !Object.keys(touch.utm).length) return null;
  const row = { src: touch.src, utm: touch.utm, capturedAt: new Date().toISOString() };
  if (store) {
    try { store.setItem(ATTR_KEY, JSON.stringify(row)); } catch (e) {}
  }
  return row;
}

export function attributionPayload(storage) {
  const row = readAttribution(storage);
  return { src: row && row.src || null, utm: row && row.utm || {} };
}

function currentSearch() {
  try { return globalThis.location && globalThis.location.search || ""; }
  catch (e) { return ""; }
}

function globalStorage() {
  try { return globalThis.localStorage || null; }
  catch (e) { return null; }
}
