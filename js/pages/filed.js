import "../boot.js";
import { efileAdapter } from "../adapters/efile.js";
import { notify } from "../adapters/notify.js";
import { getCounty } from "../counties.js";
import { contactLine, esc, money } from "../format.js";
import { planById } from "../pricing.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("filed.html");
if (gate) {
  const { matter, user } = gate;
  const plan = planById(matter.planId);
  const county = await getCounty(matter.countyId);
  const root = document.querySelector("#filed");
  const needsAgent = plan && plan.filesAsAgent;
  const agentOk = !needsAgent || (matter.signatures && matter.signatures.agent_authorization && !matter.signatures.agent_authorization.skipped);
  const certOk = matter.signatures && matter.signatures.perjury_and_statement;
  if (!agentOk || !certOk) {
    root.innerHTML = `<h1>Signatures first</h1><p>The homeowner's certification is not on this appeal yet.</p><p><a class="btn" href="sign.html?round=1">Return to signing</a></p>`;
  } else if (matter.outcome === "borderline" && !matter.reviewed && !matter.demoPreview) {
    root.innerHTML = `<h1>Waiting on review</h1><p>This check was borderline. A person has to mark it reviewed in the ops view on this browser before a filing confirmation is created.</p><p><a class="btn" href="admin.html">Open the ops view</a></p>`;
  } else if (county.status !== "verified" && !matter.demoPreview) {
    root.innerHTML = `<h1>This adapter is not verified</h1><p>${esc(county.template_warning || county.status_label)}</p><p>No filing confirmation was created.</p>`;
  } else if (!plan.filesAsAgent) {
    root.innerHTML = `
      <h1>Your kit is ready for you to file</h1>
      <p class="lead">The DIY plan does not send anything to the county. Use the steps on this adapter.</p>
      ${stepsHtml(county)}
      <div class="cta"><a class="btn" href="dashboard.html">Go to your appeal</a></div>`;
    if (!matter.stage) {
      matter.stage = "kit_ready";
      saveMatter(matter);
    }
  } else {
    let filing = matter.filing;
    if (!filing) {
      const result = await efileAdapter.submit({ matter, county });
      if (!result.ok) {
        root.innerHTML = `<h1>Not submitted</h1><p>${esc(result.reason || "The e-file adapter did not submit.")}</p>${stepsHtml(county)}`;
      } else {
        filing = {
          id: result.id,
          simulated: true,
          filedAt: result.filedAt,
          fee: result.fee,
          feeLabel: result.feeLabel,
          portalUrl: result.portalUrl
        };
        matter.filing = filing;
        matter.stage = "filed";
        matter.stageHistory = [{ stage: "filed", at: filing.filedAt, simulated: true }];
        saveMatter(matter);
        if (user.prefs.email) {
          await notify.outbox({
            channel: "email",
            to: user.email,
            kind: "filed",
            simulated: true,
            body: `Simulated filing ${filing.id} recorded in this browser. Not sent to the county.`
          });
        }
        paintFiled(root, matter, county);
      }
    } else paintFiled(root, matter, county);
  }
}

function stepsHtml(county) {
  const steps = (county.filing.paper_steps || []).map(step => `<li>${esc(step)}</li>`).join("");
  const portal = county.filing.portal_url ? `<p>Portal: <a href="${esc(county.filing.portal_url)}">${esc(county.filing.portal_url)}</a></p>` : "<p>No portal URL on this adapter.</p>";
  return `${portal}<ol>${steps}</ol><p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>`;
}

function paintFiled(root, matter, county) {
  const fee = matter.filing.fee == null ? "Fee amount is not a number on this adapter." : `${money(matter.filing.fee)} — ${matter.filing.feeLabel || ""}`;
  root.innerHTML = `
    <h1>Filing recorded</h1>
    <p class="lead">Simulated confirmation. The county portal was not contacted.</p>
    <div class="card">
      <p>Filing ID: <b>${esc(matter.filing.id)}</b></p>
      <p>Recorded at: ${esc(matter.filing.filedAt)}</p>
      <p>County fee shown from the adapter: ${esc(fee)}</p>
      <p>Portal: <a href="${esc(matter.filing.portalUrl)}">${esc(matter.filing.portalUrl)}</a></p>
      <p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>
    </div>
    ${(county.filing.portal_notes || []).map(note => `<p class="small muted">${esc(note)}</p>`).join("")}
    <div class="cta"><a class="btn" href="dashboard.html">Track the appeal</a></div>`;
}
