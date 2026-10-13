/* County shown on the check. IP city is never a headline and never decides
   launch vs not. Priority: ?county= param, then a typed address, then a
   saved correction, then an IP county name. City-only IP stays ambiguous. */

export const CHOICE_KEY = "sherwood_county_choice";

export const LAUNCH_COUNTIES = [
  { slug: "santa-cruz", id: "santa_cruz", label: "Santa Cruz County", state: "CA" }
];

const LAUNCH_CITY_TOKENS = [
  "santa cruz", "watsonville", "scotts valley", "capitola", "aptos", "soquel",
  "felton", "boulder creek", "ben lomond", "live oak", "la selva beach",
  "rio del mar", "davenport", "bonny doon", "mount hermon", "brookdale",
  "corralitos", "freedom", "interlaken", "amesti", "pleasure point", "seacliff",
  "twin lakes", "pasatiempo", "zayante"
];

/* ZIPs used only to read an address the visitor typed. Not a legal boundary. */
const LAUNCH_ZIPS = new Set([
  "95001", "95003", "95005", "95006", "95010", "95017", "95018", "95019",
  "95041", "95060", "95061", "95062", "95063", "95064", "95065", "95066",
  "95067", "95073", "95076", "95077"
]);

export function headlinePlace() {
  return "your";
}

export function countyBySlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (!slug) return null;
  return LAUNCH_COUNTIES.find(c => c.slug === slug || c.id === slug || c.id === slug.replace(/-/g, "_")) || null;
}

export function slugForCountyId(id) {
  const found = LAUNCH_COUNTIES.find(c => c.id === id);
  if (found) return found.slug;
  if (!id) return null;
  return String(id).replace(/_/g, "-");
}

function norm(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function addressKey(address) {
  return norm(address);
}

function hasToken(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(text);
}

function looksLikeCity(value) {
  const city = String(value || "").trim();
  if (!/^[A-Za-z][A-Za-z .'-]{1,40}$/.test(city)) return false;
  if (/^(ca|california|or|oregon|az|arizona|wa|washington|nv|nevada|us|usa)$/i.test(city)) return false;
  return true;
}

function cityFromAddress(address) {
  const parts = String(address || "").split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3 && looksLikeCity(parts[parts.length - 2])) return parts[parts.length - 2];
  if (parts.length === 2 && looksLikeCity(parts[0]) && /\b[A-Za-z]{2}\b/.test(parts[1])) return parts[0];
  return "";
}

export function parseAddressPlace(address) {
  const raw = String(address || "").trim();
  const text = norm(raw);
  if (!text) return { status: "ambiguous", slug: null, id: null, label: "", city: "", source: "address", confident: false };
  if (hasToken(text, "santa cruz county")) {
    return { status: "launch", slug: "santa-cruz", id: "santa_cruz", label: "Santa Cruz County", city: "Santa Cruz", source: "address", confident: true };
  }
  for (const token of LAUNCH_CITY_TOKENS) {
    if (hasToken(text, token)) {
      return { status: "launch", slug: "santa-cruz", id: "santa_cruz", label: "Santa Cruz County", city: token, source: "address", confident: true };
    }
  }
  const zip = raw.match(/\b(9\d{4})(?:-\d{4})?\b/);
  if (zip && LAUNCH_ZIPS.has(zip[1])) {
    return { status: "launch", slug: "santa-cruz", id: "santa_cruz", label: "Santa Cruz County", city: "", source: "address", confident: true };
  }
  const city = cityFromAddress(raw);
  if (city) {
    return { status: "other", slug: null, id: null, label: city, city, source: "address", confident: true };
  }
  return { status: "ambiguous", slug: null, id: null, label: "", city: "", source: "address", confident: false };
}

/* County string only. A city such as Cupertino does not choose a variant. */
export function classifyIp(geo) {
  if (!geo || geo.ok === false) {
    return { status: "ambiguous", slug: null, id: null, label: "", source: "ip", confident: false };
  }
  const county = String(geo.county || "").trim();
  if (!county) {
    return { status: "ambiguous", slug: null, id: null, label: "", source: "ip", confident: false };
  }
  if (/santa cruz/i.test(county)) {
    return { status: "launch", slug: "santa-cruz", id: "santa_cruz", label: "Santa Cruz County", source: "ip", confident: true };
  }
  return { status: "other", slug: null, id: null, label: county, source: "ip", confident: true };
}

export function choiceFromCounty(county, source) {
  return {
    status: "launch",
    slug: county.slug,
    id: county.id,
    label: county.label,
    source,
    confident: true,
    addressKey: ""
  };
}

export function otherChoice(source, label) {
  return {
    status: "other",
    slug: null,
    id: null,
    label: label || "Another county",
    source,
    confident: true,
    addressKey: ""
  };
}

export function resolvePlace({ param, stored, addressPlace, ipPlace }) {
  if (param) return { ...choiceFromCounty(param, "url"), addressKey: "" };
  const address = addressPlace && addressPlace.confident ? addressPlace : null;
  if (stored && stored.source === "user" && stored.status !== "ambiguous") {
    if (!address) return stored;
    if (stored.addressKey && address.addressKey && stored.addressKey === address.addressKey) return stored;
    return { ...address, addressKey: address.addressKey || "" };
  }
  if (address) return { ...address, addressKey: address.addressKey || "" };
  if (stored && (stored.source === "url" || stored.source === "address") && stored.status !== "ambiguous") return stored;
  if (ipPlace && ipPlace.confident) return ipPlace;
  return { status: "ambiguous", slug: null, id: null, label: "", source: "none", confident: false };
}

export function displayLabel(place) {
  if (!place || place.status === "ambiguous" || !place.label) return "your county";
  return place.label;
}
