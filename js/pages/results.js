import "../boot.js";
import { getCounty } from "../counties.js";
import { contactLine, esc, formatDay, money } from "../format.js";
import { currentMatter, saveMatter } from "../store.js";

const root = document.querySelector("#results");
const matter = currentMatter();
if (!matter || !matter.outcome) {
  location.href = "index.html";
} else {
  const county = await getCounty(matter.countyId);
  render(matter, county);
}

function render(matter, county) {
  const labels = {
    go: "Go",
    borderline: "Borderline — human review",
    no_go: "No-go",
    off_season: "Off-season"
  };
  const savings = matter.savings || {};
  const rules = (county.rules || []).map(rule => `<li>${esc(rule)}</li>`).join("");
  const timelines = (county.timelines || []).map(row => `<li>${esc(row.text)}</li>`).join("");
  let savingsHtml = `<p>Assessed value minus your market-value estimate: <b>${esc(money(matter.reduction))}</b>. Estimate, not a result.</p>`;
  if (savings.amount == null) savingsHtml += `<p>${esc(savings.note || "")}</p>`;
  else savingsHtml += `<p>Estimated first-year tax difference: <b>${esc(money(savings.amount))}</b>. Rate used: ${(savings.rate * 100).toFixed(2)}% from your tax bill ÷ assessed value. ${esc(savings.note)}</p>`;

  let next = "";
  if (matter.outcome === "go") {
    next = `<div class="cta"><a class="btn" href="login.html?next=checkout.html">Create an account and choose a plan</a></div>`;
  } else if (matter.outcome === "borderline") {
    next = `<p>You can create an account. Sherwood will not treat this as ready to file until a person marks it reviewed. The ops queue on this browser lists it.</p>
      <div class="cta"><a class="btn" href="login.html?next=checkout.html">Create an account</a></div>`;
  } else if (matter.outcome === "no_go") {
    next = `<p>There is no checkout on a no-go. Your email is already stored with this check.</p>
      <div class="cta"><a class="btn ghost" href="how-it-works.html">See how a case moves when the numbers support it</a></div>`;
  } else {
    next = `<p>${esc(county.informal_review || "")}</p>
      <p>Assessor contact from the adapter: ${esc(contactLine(county.assessor_office))}</p>
      <div class="cta"><button class="btn" id="waitlist" type="button">Join the waitlist</button>
      <a class="btn ghost" href="login.html?next=checkout.html" id="preview">Preview the rest of the product anyway</a></div>
      <p id="waitlist-ok" class="small muted" hidden>You're on the waitlist in this browser. No email was sent.</p>`;
  }

  root.innerHTML = `
    <p class="badge">${esc(labels[matter.outcome] || matter.outcome)}</p>
    <h1>Your check</h1>
    <p class="lead">For ${esc(matter.address)}. County adapter: ${esc(county.county)} (${esc(county.status_label)}).</p>
    <div class="card">
      ${savingsHtml}
      <p class="small muted">Window: ${esc(matter.window && matter.window.label || "not set")}. Adapter deadline: ${esc(formatDay(county.filing.current_year_deadline))}.</p>
      <p>County fee on this adapter: ${esc((county.filing.efile && county.filing.efile_fee && county.filing.efile_fee.label) || (county.filing.paper_fee && county.filing.paper_fee.label) || "No fee is set. Do not quote one.")}</p>
      <ul>${(matter.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    </div>
    ${next}
    <h2>What this county adapter says</h2>
    <ul>${rules}</ul>
    <ul>${timelines}</ul>
    <p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>
    <div class="card" aria-label="Comparable sales locked">
      <p class="muted small" style="margin-top:0">Comparable sales</p>
      <p class="blur" aria-hidden="true">0000 Sample St · $0,000,000</p>
      <p class="small muted" style="margin-bottom:0">Locked because this demo does not have comparable sales for your address. We do not invent them. The pilot method is on the case study page, and those sales belong to that pilot, not to this check.</p>
    </div>`;

  const wait = document.querySelector("#waitlist");
  if (wait) {
    wait.addEventListener("click", () => {
      matter.waitlist = true;
      saveMatter(matter);
      document.querySelector("#waitlist-ok").hidden = false;
    });
  }
  const preview = document.querySelector("#preview");
  if (preview) {
    preview.addEventListener("click", () => {
      matter.demoPreview = true;
      saveMatter(matter);
    });
  }
}
