import "../boot.js";
import { docusignAdapter } from "../adapters/docusign.js";
import {
  AGENT_CONTACT, OWNER_COPY_LINE, normalizeTaxYears, parcelLabel, signedDateText, taxYearChoices
} from "../authorization.js";
import { getCounty } from "../counties.js";
import { esc, formatShortDay } from "../format.js";
import { planById } from "../pricing.js";
import { AUTHORIZATION_RETENTION, retainUntil } from "../retention.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("sign.html");
if (gate) {
  const { matter } = gate;
  if (!matter.kit) location.href = "kit.html";
  else {
    const county = await getCounty(matter.countyId);
    const plan = planById(matter.planId);
    const round = Number(new URLSearchParams(location.search).get("round") || "1");
    const step = (county.signature_steps || []).find(s => s.round === round);
    const root = document.querySelector("#sign");
    if (!step) {
      root.innerHTML = `<h1>No signing step</h1><p><a href="dashboard.html">Back to your appeal</a></p>`;
    } else if (step.required_for && step.required_for.length && !step.required_for.includes(matter.planId)) {
      matter.signatures[step.id] = { skipped: true, reason: `${plan ? plan.name : matter.planId} does not use this step.`, at: new Date().toISOString() };
      saveMatter(matter);
      location.href = round === 1 ? "sign.html?round=2" : "filed.html";
    } else {
      const envelope = await docusignAdapter.createEnvelope({
        matterId: matter.id,
        round,
        stepId: step.id,
        title: step.title
      });
      if (step.id === "agent_authorization") paintExplainer(root, matter, county, () => paintForm(root, matter, county, step, round, envelope));
      else paintForm(root, matter, county, step, round, envelope);
    }
  }
}

function paintExplainer(root, matter, county, onContinue) {
  const doc = county.agent_authorization || {};
  const why = doc.verified
    ? esc(doc.source || "This adapter does not state a source.")
    : `${esc(doc.source || "This adapter does not state a source.")} This adapter has not verified that an agent may file.`;
  const years = taxYearChoices(county, new Date());
  root.innerHTML = `
    <h1>Before you sign</h1>
    <p class="lead">${esc(doc.doc_title || "Agent authorization")} for ${esc(county.county)}.</p>
    <div class="card">
      <p><b>What you're signing.</b> You authorize Sherwood to file this appeal as your agent for this parcel and the tax years you select, up to 4. You still sign the perjury certification yourself.</p>
      <p><b>Why the county needs it.</b> ${why}</p>
      <p>How to revoke: [pending verification]</p>
    </div>
    ${summaryHtml(matter, years[0], null)}
    <button class="btn" id="to-sign" type="button">Continue to sign</button>`;
  root.querySelector("#to-sign").addEventListener("click", onContinue);
}

function summaryHtml(matter, years, signedAt) {
  const list = Array.isArray(years) ? years : [years];
  const dateLine = signedAt
    ? `Date signed: ${signedDateText(signedAt)}. This is the day it was signed. It was not backdated.`
    : `Date signed: ${formatShortDay(new Date())}. This is the day you sign. It cannot be set to an earlier date.`;
  return `
    <div class="card">
      <h3>Agent authorization summary (state rule 305)</h3>
      <p>Parcel: ${esc(parcelLabel(matter))}.</p>
      <p data-tax-years>Tax years covered: ${esc(list.filter(Boolean).join(", "))}. Up to 4.</p>
      <p>${esc(OWNER_COPY_LINE)}</p>
      <p>${esc(dateLine)}</p>
      <p>Agent name: ${esc(AGENT_CONTACT.name)}</p>
      <p>Agent address: ${esc(AGENT_CONTACT.address)}</p>
      <p>Agent phone: ${esc(AGENT_CONTACT.phone)}</p>
    </div>`;
}

function paintForm(root, matter, county, step, round, envelope) {
  const yearChoices = step.id === "agent_authorization" ? taxYearChoices(county, new Date()) : [];
  const yearFields = yearChoices.map((year, index) => `
    <label class="check"><input type="checkbox" name="taxYear" value="${year}" ${index === 0 ? "checked" : ""}> ${year}</label>`).join("");
  root.innerHTML = `
    <p class="banner">Simulated embedded signing. Not a DocuSign session. Sherwood cannot sign as you.</p>
    <h1>${esc(step.title)}</h1>
    <p class="lead">Round ${esc(String(round))} of the model. Signer: the homeowner. Adapter: ${esc(county.county)}.</p>
    ${step.id === "agent_authorization" ? summaryHtml(matter, yearChoices[0], null) : ""}
    <div class="card">
      <p>${esc(step.text)}</p>
      ${round === 2 ? `<h3>Statement you are attaching</h3><pre style="white-space:pre-wrap;font:inherit">${esc(matter.kit.statement)}</pre>` : ""}
      ${round === 3 ? `<p>There is no stipulation document in the pilot kit. Signing here only records that you chose to accept in this demo.</p>` : ""}
      <p class="small muted">Envelope ${esc(envelope.id)} · ${esc(envelope.status)} · simulated</p>
    </div>
    <form id="sign-form" class="wide">
      ${yearFields ? `<fieldset><legend>Tax years covered, up to 4</legend>${yearFields}<p class="err" id="year-err" hidden>Choose at least one tax year, and no more than 4.</p></fieldset>` : ""}
      <label>Type your full name as the signature<input name="signer" required value="${esc(matter.intake && matter.intake.name || "")}"></label>
      <label class="check"><input type="checkbox" name="read" required> I read this screen. I know it is a simulation and not the official county form.</label>
      <button class="btn" type="submit">Sign</button>
    </form>`;
  if (step.id === "agent_authorization") {
    const yearLine = root.querySelector("[data-tax-years]");
    const syncYears = () => {
      const picked = normalizeTaxYears(
        [...root.querySelectorAll("input[name=taxYear]:checked")].map(el => el.value),
        yearChoices
      );
      if (yearLine) yearLine.textContent = `Tax years covered: ${picked.join(", ") || "none selected"}. Up to 4.`;
    };
    root.querySelectorAll("input[name=taxYear]").forEach(el => el.addEventListener("change", syncYears));
  }
  root.querySelector("#sign-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!e.target.reportValidity()) return;
    const formData = new FormData(e.target);
    const signerName = formData.get("signer");
    let taxYears = [];
    if (step.id === "agent_authorization") {
      taxYears = normalizeTaxYears(formData.getAll("taxYear"), yearChoices);
      const yearErr = root.querySelector("#year-err");
      if (!taxYears.length || taxYears.length > 4) {
        if (yearErr) yearErr.hidden = false;
        return;
      }
      if (yearErr) yearErr.hidden = true;
    }
    const signed = await docusignAdapter.sign({ envelopeId: envelope.id, signerName });
    const signedAt = signed && signed.completedAt;
    if (!signedAt) return;
    matter.signatures[step.id] = { envelopeId: signed.id, signerName, at: signedAt, simulated: true };
    if (step.id === "agent_authorization") {
      const doc = county.agent_authorization || { doc_title: step.title, source: null, verified: false };
      matter.agentAuthorization = {
        doc_title: doc.doc_title,
        source: doc.source,
        verified: doc.verified === true,
        signerName,
        signedAt,
        envelopeId: signed.id,
        simulated: true,
        parcel: parcelLabel(matter),
        taxYears,
        ownerGetsCopy: true,
        agentName: AGENT_CONTACT.name,
        agentAddress: AGENT_CONTACT.address,
        agentPhone: AGENT_CONTACT.phone,
        retainUntil: retainUntil(signedAt),
        retention: AUTHORIZATION_RETENTION
      };
    }
    if (round === 3) matter.stipulationDecision = "Accepted in the demo. The signature is simulated and there is no stipulation form in the pilot kit.";
    saveMatter(matter);
    if (round === 1) location.href = "sign.html?round=2";
    else if (round === 2) location.href = "filed.html";
    else location.href = "dashboard.html";
  });
}
