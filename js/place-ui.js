import {
  CHOICE_KEY, addressKey, choiceFromCounty, classifyIp, countyBySlug, displayLabel,
  headlinePlace, otherChoice, parseAddressPlace, resolvePlace
} from "./place.js";
import { createReminder } from "./reminders.js";

const GEO_KEY = "sherwood_geo";
const PARAM_KEY = "sherwood_county_param";
const PRIVACY = `We use your email and approximate location only to run your check and send what you ask for. <a href="privacy.html">Privacy policy</a>.`;

function readStored() {
  try { return JSON.parse(localStorage.getItem(CHOICE_KEY) || "null"); }
  catch (e) { return null; }
}
function writeStored(choice) {
  localStorage.setItem(CHOICE_KEY, JSON.stringify({ ...choice, at: new Date().toISOString() }));
}
function readIp() {
  try { return JSON.parse(sessionStorage.getItem(GEO_KEY) || "null"); }
  catch (e) { return null; }
}

export function paramCounty() {
  const fromUrl = countyBySlug(new URLSearchParams(location.search).get("county"));
  if (fromUrl) {
    try { sessionStorage.setItem(PARAM_KEY, fromUrl.slug); } catch (e) {}
    return fromUrl;
  }
  try { return countyBySlug(sessionStorage.getItem(PARAM_KEY)); }
  catch (e) { return null; }
}

export function currentPlace(address) {
  const parsed = address ? parseAddressPlace(address) : null;
  if (parsed) parsed.addressKey = addressKey(address);
  return resolvePlace({
    param: paramCounty(),
    stored: readStored(),
    addressPlace: parsed,
    ipPlace: classifyIp(readIp())
  });
}

export function rememberAddress(address) {
  const parsed = parseAddressPlace(address);
  parsed.addressKey = addressKey(address);
  if (paramCounty()) return currentPlace(address);
  if (!parsed.confident) return currentPlace(address);
  const stored = readStored();
  if (stored && stored.source === "user" && stored.addressKey && stored.addressKey === parsed.addressKey) {
    return stored;
  }
  const next = { ...parsed, source: "address", addressKey: parsed.addressKey };
  writeStored(next);
  return next;
}

function applyRegion(geo) {
  const region = geo && geo.ok && geo.region ? geo.region : null;
  if (!region) return;
  document.querySelectorAll("[data-geo='region']").forEach(el => {
    el.textContent = region;
  });
}

function renderBar(place) {
  document.querySelectorAll("[data-place-bar]").forEach(host => {
    const openPicker = place.status === "ambiguous";
    host.innerHTML = `
      <p class="place-bar">Showing results for ${escapeHtml(displayLabel(place))} · <button type="button" data-place-change>change</button></p>
      <div class="place-picker" data-place-picker ${openPicker ? "" : "hidden"}>
        <label>County
          <select data-place-select>
            <option value="">Choose…</option>
            <option value="santa-cruz">Santa Cruz County, CA</option>
            <option value="other">Another county</option>
          </select>
        </label>
      </div>`;
    host.querySelector("[data-place-change]").addEventListener("click", () => {
      host.querySelector("[data-place-picker]").hidden = false;
      host.querySelector("[data-place-select]").focus();
    });
    host.querySelector("[data-place-select]").addEventListener("change", e => {
      const value = e.target.value;
      if (!value) return;
      try { sessionStorage.removeItem(PARAM_KEY); } catch (err) {}
      const url = new URL(location.href);
      if (url.searchParams.has("county")) {
        url.searchParams.delete("county");
        history.replaceState({}, "", url);
      }
      const address = currentAddress();
      const choice = value === "other"
        ? otherChoice("user", "Another county")
        : choiceFromCounty(countyBySlug(value), "user");
      choice.addressKey = address ? addressKey(address) : "";
      writeStored(choice);
      paint(currentPlace(address));
    });
  });
}

function currentAddress() {
  const input = document.querySelector("#check-form input[name=address]");
  if (input && input.value.trim()) return input.value.trim();
  const shown = document.querySelector("#for-address");
  const text = shown && shown.textContent.trim();
  if (!text || text === "your property") return "";
  return text;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function paintHeadline(address) {
  const city = headlinePlace({ param: paramCounty(), address });
  document.querySelectorAll("[data-headline-city]").forEach(el => {
    el.textContent = city;
  });
}

function paint(place) {
  renderBar(place);
  paintHeadline(currentAddress());
  const launch = document.querySelector("#home-launch");
  const other = document.querySelector("#home-other");
  const ambiguous = document.querySelector("#home-ambiguous");
  if (!launch) return;
  launch.hidden = place.status !== "launch";
  other.hidden = place.status !== "other";
  ambiguous.hidden = place.status !== "ambiguous";
  const check = document.querySelector("#check-form");
  const under = document.querySelector("#home-under");
  if (check) check.hidden = place.status === "other" && !check.dataset.forced;
  if (under && check) under.hidden = check.hidden;
}

function showCheckAnyway() {
  const check = document.querySelector("#check-form");
  const other = document.querySelector("#home-other");
  if (!check) return;
  check.dataset.forced = "1";
  check.hidden = false;
  const under = document.querySelector("#home-under");
  if (under) under.hidden = false;
  if (other) other.hidden = false;
}

async function lookupGeo() {
  const ipapi = await fetchJson("https://ipapi.co/json/");
  if (ipapi && !ipapi.error && (ipapi.city || ipapi.region || ipapi.county)) {
    return {
      ok: true,
      city: ipapi.city || "",
      region: ipapi.region || "",
      regionCode: ipapi.region_code || "",
      country: ipapi.country_name || ipapi.country || "",
      countryCode: ipapi.country || "",
      county: ipapi.county || ""
    };
  }
  const geojs = await fetchJson("https://get.geojs.io/v1/ip/geo.json");
  if (geojs && !geojs.error && (geojs.city || geojs.region || geojs.county)) {
    return {
      ok: true,
      city: geojs.city || "",
      region: geojs.region || "",
      regionCode: geojs.region_code || "",
      country: geojs.country || "",
      countryCode: geojs.country_code || "",
      county: geojs.county || ""
    };
  }
  return { ok: false, city: "", region: "", county: "" };
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function startPlace() {
  const param = paramCounty();
  if (param) writeStored(choiceFromCounty(param, "url"));
  let place = currentPlace(currentAddress());
  applyRegion(readIp());
  paint(place);
  const show = document.querySelector("#show-check");
  if (show) show.addEventListener("click", showCheckAnyway);
  const addressInput = document.querySelector("#check-form input[name=address]");
  if (addressInput && !addressInput.dataset.headlineBound) {
    addressInput.dataset.headlineBound = "1";
    addressInput.addEventListener("input", () => paintHeadline(currentAddress()));
  }
  bindReminder();
  if (param || (readStored() && readStored().source === "user")) return place;
  let geo = readIp();
  if (!geo) {
    geo = await lookupGeo();
    try { sessionStorage.setItem(GEO_KEY, JSON.stringify(geo)); } catch (e) {}
  }
  applyRegion(geo);
  if (paramCounty()) return currentPlace(currentAddress());
  const stored = readStored();
  if (stored && (stored.source === "user" || stored.source === "address" || stored.source === "url")) {
    return currentPlace(currentAddress());
  }
  place = currentPlace(currentAddress());
  paint(place);
  return place;
}

function bindReminder() {
  const form = document.querySelector("#county-reminder");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  form.noValidate = true;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = String(new FormData(form).get("email") || "").trim();
    const note = form.querySelector(".err");
    if (note) note.remove();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const m = document.createElement("div");
      m.className = "err";
      m.textContent = "Enter a valid email.";
      form.querySelector("button").before(m);
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const addressField = document.querySelector("#check-form input[name=address]");
    const address = addressField && String(addressField.value || "").trim();
    const result = await createReminder({
      email,
      county_slug: null,
      address: address || null,
      marketing_consent: true,
      consent_source: "non_launch_home"
    });
    const ok = form.querySelector("#county-reminder-ok");
    ok.hidden = false;
    ok.textContent = reminderMessage(result);
    btn.disabled = false;
  });
}

export function reminderMessage(result) {
  if (result && result.ok && result.simulated) return "Saved in this browser. No email was sent.";
  if (result && result.ok && result.email_sent) return "Check your email to confirm the reminder.";
  if (result && result.ok && result.already) return "This reminder is already confirmed.";
  if (result && result.ok) return "Saved. The reminder email was not sent because sending is not configured yet.";
  return (result && result.error) || "The reminder could not be saved.";
}

export { PRIVACY };
