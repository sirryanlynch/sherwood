import "../boot.js";
import { docusignAdapter } from "../adapters/docusign.js";
import { getCounty } from "../counties.js";
import { esc } from "../format.js";
import { planById } from "../pricing.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("sign.html");
if (gate) {
  const { matter, user } = gate;
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
      matter.signatures[step.id] = { skipped: true, reason: `${plan.name} does not use this step.`, at: new Date().toISOString() };
      saveMatter(matter);
      location.href = round === 1 ? "sign.html?round=2" : "filed.html";
    } else {
      const envelope = await docusignAdapter.createEnvelope({
        matterId: matter.id,
        round,
        stepId: step.id,
        title: step.title
      });
      root.innerHTML = `
        <p class="banner">Simulated embedded signing. Not a DocuSign session. Sherwood cannot sign as you.</p>
        <h1>${esc(step.title)}</h1>
        <p class="lead">Round ${esc(String(round))} of the model. Signer: the homeowner. Adapter: ${esc(county.county)}.</p>
        <div class="card">
          <p>${esc(step.text)}</p>
          ${round === 2 ? `<h3>Statement you are attaching</h3><pre style="white-space:pre-wrap;font:inherit">${esc(matter.kit.statement)}</pre>` : ""}
          ${round === 3 ? `<p>There is no stipulation document in the pilot kit. Signing here only records that you chose to accept in this demo.</p>` : ""}
          <p class="small muted">Envelope ${esc(envelope.id)} · ${esc(envelope.status)} · simulated</p>
        </div>
        <form id="sign-form" class="wide">
          <label>Type your full name as the signature<input name="signer" required value="${esc(matter.intake && matter.intake.name || "")}"></label>
          <label class="check"><input type="checkbox" name="read" required> I read this screen. I know it is a simulation and not the official county form.</label>
          <button class="btn" type="submit">Sign</button>
        </form>`;
      root.querySelector("#sign-form").addEventListener("submit", async e => {
        e.preventDefault();
        if (!e.target.reportValidity()) return;
        const signerName = new FormData(e.target).get("signer");
        const signed = await docusignAdapter.sign({ envelopeId: envelope.id, signerName });
        matter.signatures[step.id] = { envelopeId: signed.id, signerName, at: signed.completedAt, simulated: true };
        if (round === 3) matter.stipulationDecision = "Accepted in the demo. The signature is simulated and there is no stipulation form in the pilot kit.";
        saveMatter(matter);
        if (round === 1) location.href = "sign.html?round=2";
        else if (round === 2) location.href = "filed.html";
        else location.href = "dashboard.html";
      });
    }
  }
}
