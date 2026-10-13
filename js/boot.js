import { getCounty, loadCounties } from "./counties.js";
import { contactLine, esc, formatDay, money } from "./format.js";

const SIM = "Simulated on this device. Payment, signatures, county filing, and email or SMS do not leave this browser.";

async function fillLaunchFacts() {
  const slots = document.querySelectorAll("[data-fact]");
  if (!slots.length && !document.getElementById("launch-facts") && !document.getElementById("launch-filing") && !document.getElementById("launch-fee")) return;
  const county = await getCounty("santa_cruz");
  if (!county) return;
  slots.forEach(el => {
    if (el.getAttribute("data-fact") === "santa_cruz.clerk") {
      el.textContent = contactLine(county.filing.clerk);
    }
  });
  const facts = document.getElementById("launch-facts");
  if (facts) {
    const fee = county.filing.efile_fee;
    const paper = county.filing.paper_fee;
    facts.innerHTML = `
      <p class="small muted">These lines are rendered from the Santa Cruz County adapter (${esc(county.status_label)}).</p>
      <ul>
        <li>Regular window: ${esc(county.filing.regular_window.label)}. Deadline on the adapter: ${esc(formatDay(county.filing.current_year_deadline))}. Source: ${county.filing.regular_window.source_url ? `<a href="${esc(county.filing.regular_window.source_url)}">${esc(county.filing.regular_window.source_url)}</a>` : "not set"}. Verified: ${esc(formatDay(county.filing.regular_window.verified_date))}.</li>
        <li>E-file fee: ${esc(fee.label)}</li>
        <li>Paper fee: ${esc(paper.label)}</li>
        <li>${esc(county.filing.fee_conflict)}</li>
        <li>Portal: <a href="${esc(county.filing.portal_url)}">${esc(county.filing.portal_url)}</a></li>
        <li>Clerk: ${esc(contactLine(county.filing.clerk))}</li>
        <li>Assessor: ${esc(contactLine(county.assessor_office))}</li>
        <li>Supplemental: ${esc(county.filing.supplemental_window)}</li>
        <li>Hearing: ${esc(county.hearing.notice)} ${esc(county.hearing.format)}</li>
        <li>Homeowner's Exemption, from this adapter: $${county.homeowner_exemption.assessed_reduction.toLocaleString("en-US")} off assessed value, about $${county.homeowner_exemption.approx_annual_dollars}/yr. ${esc(county.homeowner_exemption.note)}</li>
      </ul>`;
  }
  const filing = document.getElementById("launch-filing");
  if (filing) {
    filing.innerHTML = `
      <p>Launch county, from the adapter: ${esc(county.county)} County. ${esc(county.filing.efile ? "E-file is the path used in the pilot." : "Paper.")}</p>
      <p>Portal: <a href="${esc(county.filing.portal_url)}">${esc(county.filing.portal_url)}</a></p>
      <p>${esc(county.filing.efile_fee.label)}</p>
      <p>${esc(county.agent.source)} ${esc(county.agent.perjury)}</p>`;
  }
  const feeBox = document.getElementById("launch-fee");
  if (feeBox) {
    feeBox.textContent = `${county.filing.efile_fee.label} ${county.filing.fee_conflict} Paper: ${county.filing.paper_fee.label}`;
  }
  const calendar = document.getElementById("deadline-note");
  if (calendar) calendar.textContent = county.deadline_note || county.filing.deadline_note || "";
}

function mountChrome() {
  document.querySelectorAll("[data-sim]").forEach(el => {
    if (!el.textContent.trim()) el.textContent = SIM;
  });
  const bar = document.querySelector("[data-progress]");
  if (bar) {
    const current = bar.getAttribute("data-progress");
    const steps = ["Check", "Account", "Plan", "Intake", "Kit", "Sign", "File", "Track"];
    bar.innerHTML = steps.map(step => {
      const on = step === current ? " aria-current=\"step\"" : "";
      return `<span${on}>${esc(step)}</span>`;
    }).join("");
  }
}

mountChrome();
fillLaunchFacts().catch(err => {
  document.querySelectorAll("[data-fact]").forEach(el => {
    el.textContent = "County adapter failed to load.";
  });
  console.error(err);
});

export async function countyOptions(select) {
  const counties = await loadCounties();
  select.innerHTML = counties.map(c => `<option value="${esc(c.id)}">${esc(c.county)} — ${esc(c.status_label)}</option>`).join("");
  return counties;
}

export { money };
