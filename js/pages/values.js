import "../boot.js";
import { loadCounties } from "../counties.js";
import { decide } from "../engine.js";
import { esc, moneyToNumber } from "../format.js";
import { currentMatter, newMatter, saveMatter } from "../store.js";

const form = document.querySelector("#values-form");
const select = form.querySelector("select[name=county]");
const banner = document.querySelector("#county-banner");
const check = JSON.parse(sessionStorage.getItem("sherwood_check") || "null");
if (!check || !check.address || !check.email) {
  location.href = "index.html";
} else {
  document.querySelector("#for-address").textContent = check.address;
}

const counties = await loadCounties();
select.innerHTML = counties.map(c => `<option value="${esc(c.id)}">${esc(c.county)} — ${esc(c.status_label)}</option>`).join("");

function selectedCounty() {
  return counties.find(c => c.id === select.value);
}

function showCounty() {
  const county = selectedCounty();
  if (!county) return;
  const bits = [
    county.template_warning,
    county.filing.regular_window && county.filing.regular_window.label,
    county.filing.efile ? "E-file flag is true on this adapter." : "E-file flag is false on this adapter (paper / mail).",
    county.filing.efile_fee && county.filing.efile_fee.label,
    county.filing.paper_fee && county.filing.paper_fee.label
  ].filter(Boolean);
  banner.innerHTML = bits.map(line => `<p>${esc(line)}</p>`).join("");
}
select.addEventListener("change", showCounty);
showCounty();

form.noValidate = true;
form.addEventListener("submit", e => {
  e.preventDefault();
  form.querySelectorAll(".err").forEach(n => n.remove());
  const assessed = moneyToNumber(form.assessed.value);
  const market = moneyToNumber(form.market.value);
  const tax = moneyToNumber(form.tax.value);
  if (assessed == null || market == null) {
    const m = document.createElement("div");
    m.className = "err";
    m.textContent = "Enter the assessed value and your estimate of market value.";
    form.querySelector("button").before(m);
    return;
  }
  const county = selectedCounty();
  const result = decide({
    county,
    assessed,
    market,
    tax,
    confidence: form.confidence.value,
    supplementalNoticeDate: form.supplemental.value || null,
    today: new Date()
  });
  const existing = currentMatter();
  const matter = {
    ...(existing || {}),
    address: check.address,
    email: check.email,
    geo: { city: check.geoCity || "", region: check.geoRegion || "", inLaunchArea: check.inLaunchArea === true },
    countyId: county.id,
    assessed,
    market,
    tax,
    confidence: form.confidence.value,
    supplementalNoticeDate: form.supplemental.value || null,
    outcome: result.outcome,
    reasons: result.reasons,
    reduction: result.reduction,
    savings: result.savings,
    fee: result.fee,
    window: result.window,
    decidedAt: new Date().toISOString()
  };
  if (existing) saveMatter(matter);
  else newMatter(matter);
  location.href = "results.html";
});
