import { getCounty, loadCounties } from "./counties.js";
import { mountStatutoryDisclosure } from "./statutoryDisclosure.js";
import { contactLine, esc, formatDay, money } from "./format.js";
import { filingFeeNote, planPriceLines } from "./pricing.js";

const SIM = "Simulated on this device. Payment, signatures, county filing, and email or SMS do not leave this browser.";

async function fillLaunchFacts() {
  const slots = document.querySelectorAll("[data-fact]");
  const needsPlans = document.getElementById("home-price") || document.getElementById("plan-diy-price") || document.getElementById("faq-prices") || document.getElementById("how-plans");
  if (!slots.length && !document.getElementById("launch-facts") && !document.getElementById("launch-filing") && !document.getElementById("launch-fee") && !needsPlans) return;
  const county = await getCounty("santa_cruz");
  if (!county) return;
  slots.forEach(el => {
    if (el.getAttribute("data-fact") === "santa_cruz.clerk") {
      el.textContent = contactLine(county.filing.clerk);
    }
  });
  const lines = planPriceLines(county);
  const facts = document.getElementById("launch-facts");
  if (facts) {
    const fee = county.filing.efile_fee;
    const paper = county.filing.paper_fee;
    const prices = lines.fee == null
      ? `${lines.diy}. ${lines.dfy}.`
      : `DIY kit ${lines.diy} ${lines.diyFee} We file it ${lines.dfy}`;
    facts.innerHTML = `
      <p class="small muted">These lines are rendered from the Santa Cruz County adapter (${esc(county.status_label)}).</p>
      <ul>
        <li>Regular window: ${esc(county.filing.regular_window.label)}. Deadline on the adapter: ${esc(formatDay(county.filing.current_year_deadline))}. Source: ${county.filing.regular_window.source_url ? `<a href="${esc(county.filing.regular_window.source_url)}">${esc(county.filing.regular_window.source_url)}</a>` : "not set"}. Verified: ${esc(formatDay(county.filing.regular_window.verified_date))}.</li>
        <li>Sherwood prices: ${esc(prices)}</li>
        <li>E-file fee recorded in the kit: ${esc(fee.label)}</li>
        <li>Paper fee recorded in the kit: ${esc(paper.label)}</li>
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
    const prices = lines.fee == null
      ? `${lines.diy}. ${lines.dfy}.`
      : `DIY kit ${lines.diy} ${lines.diyFee} We file it ${lines.dfy}`;
    filing.innerHTML = `
      <p>Launch county, from the adapter: ${esc(county.county)} County. ${esc(county.filing.efile ? "E-file is the path used in the pilot." : "Paper.")}</p>
      <p>Portal: <a href="${esc(county.filing.portal_url)}">${esc(county.filing.portal_url)}</a></p>
      <p>${esc(prices)}</p>
      <p>${esc(county.agent.source)} ${esc(county.agent.perjury)}</p>`;
  }
  paintPlanPrices(county);
  const feeBox = document.getElementById("launch-fee");
  if (feeBox) {
    feeBox.textContent = lines.fee == null
      ? ""
      : `DIY kit ${lines.diy} ${lines.diyFee} We file it ${lines.dfy}`;
  }
  const calendar = document.getElementById("deadline-note");
  if (calendar) calendar.textContent = county.deadline_note || county.filing.deadline_note || "";
}

mountStatutoryDisclosure();

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

function paintPlanPrices(county) {
  const lines = planPriceLines(county);
  const home = document.getElementById("home-price");
  if (home) home.textContent = lines.home;
  const diy = document.getElementById("plan-diy-price");
  if (diy) diy.textContent = lines.diyLine;
  const feeNote = document.getElementById("filing-fee-note");
  if (feeNote) feeNote.textContent = filingFeeNote(county);
  const dfy = document.getElementById("plan-dfy-price");
  if (dfy) dfy.textContent = lines.dfy;
  const faq = document.getElementById("faq-prices");
  if (faq) {
    faq.textContent = lines.fee == null
      ? `DIY kit ${lines.diy}. We file it ${lines.dfy}.`
      : `DIY kit ${lines.diy} ${lines.diyFee} We file it ${lines.dfy}`;
  }
  const how = document.getElementById("how-plans");
  if (how) {
    const diyBit = lines.diyFee ? `${lines.diy} ${lines.diyFee.replace(/\.$/, "")}` : lines.diy;
    const dfyBit = lines.dfy.replace(/\.$/, "");
    how.textContent = `A simulated magic link, then two plans: DIY kit (${diyBit}) or We file it (${dfyBit}). Checkout stops when that county's filing window is closed.`;
  }
}

export async function countyOptions(select) {
  const counties = await loadCounties();
  select.innerHTML = counties.map(c => `<option value="${esc(c.id)}">${esc(c.county)} — ${esc(c.status_label)}</option>`).join("");
  return counties;
}

export { money };
