import "../boot.js";
import { efileAdapter } from "../adapters/efile.js";
import { notify } from "../adapters/notify.js";
import { getCounty } from "../counties.js";
import { AGENT_CONTACT, OWNER_COPY_LINE, authorizationReady, signedBeforeFiling, signedDateText } from "../authorization.js";
import { AUTHORIZATION_RETENTION } from "../retention.js";
import { contactLine, esc } from "../format.js";
import { filingWindow } from "../engine.js";
import { planById, planPriceLines } from "../pricing.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("filed.html");
if (gate) {
  const { matter, user } = gate;
  const plan = planById(matter.planId);
  const county = await getCounty(matter.countyId);
  const root = document.querySelector("#filed");
  if (!plan) {
    root.innerHTML = `<h1>No plan on this appeal</h1><p><a class="btn" href="checkout.html">Choose a plan</a></p>`;
  } else if (!plan.filesAsAgent) {
    root.innerHTML = `
      <h1>Your kit is ready for you to file</h1>
      <p class="lead">The DIY kit does not send anything to the county. Use the steps on this adapter.</p>
      ${stepsHtml(county)}
      <div class="cta"><a class="btn" href="dashboard.html">Go to your appeal</a></div>`;
    if (!matter.stage) {
      matter.stage = "kit_ready";
      saveMatter(matter);
    }
  } else if (matter.filing) {
    paintFiled(root, matter, county);
  } else {
    paintGate(root, matter, user, county);
  }
}

function paintGate(root, matter, user, county) {
  const doc = county.agent_authorization || {};
  const auth = matter.agentAuthorization;
  const signed = authorizationReady(auth);
  const certOk = !!(matter.signatures && matter.signatures.perjury_and_statement && !matter.signatures.perjury_and_statement.skipped);
  const season = filingWindow(county, new Date(), matter.supplementalNoticeDate);
  const blocks = [];
  if (!signed) {
    const title = doc.doc_title || "the agent authorization";
    const source = doc.source || "This adapter does not define an agent authorization document.";
    blocks.push(`Filing stays off until the agent authorization is complete: date signed, tax years (4 at most), parcel, agent name, address, and phone, and your signature and title. ${title}. ${source}`);
  }
  if (!certOk) blocks.push("The homeowner certification is not signed yet.");
  if (matter.outcome === "borderline" && !matter.reviewed) blocks.push("A person has to mark this review complete before filing.");
  if (county.status !== "verified") blocks.push(county.template_warning || county.status_label || "This adapter is not verified.");
  if (season.state !== "open") blocks.push("The filing window on this adapter is not open, so filing stays off.");
  const canFile = blocks.length === 0;
  root.innerHTML = `
    <h1>File with the county</h1>
    <p class="lead">Sherwood files only after the agent authorization on this adapter is signed and stored on this appeal.</p>
    <div class="card">
      <p>Document: <b>${esc(doc.doc_title || "Not defined on this adapter")}</b></p>
      <p class="small muted">${esc(doc.source || "No source on this adapter.")} Verified on the adapter: ${doc.verified === true ? "yes" : "no"}.</p>
      ${signed ? `<p>Signed by ${esc(auth.signerName)} at ${esc(auth.signedAt)}. Stored on this appeal.</p>` : `<p>Not signed yet.</p>`}
      ${blocks.length ? `<ul>${blocks.map(line => `<li>${esc(line)}</li>`).join("")}</ul>` : `<p>The authorization is on this appeal. You can record the filing.</p>`}
    </div>
    <button class="btn" id="file-btn" type="button" ${canFile ? "" : "disabled"}>Record the filing</button>
    ${canFile ? "" : `<p class="cta"><a href="sign.html?round=1">Return to signing</a></p>`}
    ${stepsHtml(county)}`;
  const button = root.querySelector("#file-btn");
  if (button && canFile) {
    button.addEventListener("click", () => submitFiling(root, matter, user, county));
  }
}

async function submitFiling(root, matter, user, county) {
  const button = root.querySelector("#file-btn");
  if (button) button.disabled = true;
  if (!authorizationReady(matter.agentAuthorization) || !signedBeforeFiling(matter.agentAuthorization, new Date().toISOString())) {
    root.innerHTML = `<h1>Not submitted</h1><p>The agent authorization is missing a required field, or it was not signed before filing, so nothing was filed.</p>`;
    return;
  }
  const result = await efileAdapter.submit({ matter, county });
  if (!result.ok) {
    root.innerHTML = `<h1>Not submitted</h1><p>${esc(result.reason || "The e-file adapter did not submit.")}</p>${stepsHtml(county)}`;
    return;
  }
  if (!signedBeforeFiling(matter.agentAuthorization, result.filedAt)) {
    root.innerHTML = `<h1>Not submitted</h1><p>The agent authorization has to be signed before the filing time. Nothing was stored as filed.</p>`;
    return;
  }
  const filing = {
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
  if (user.prefs && user.prefs.email) {
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

function stepsHtml(county) {
  const steps = (county.filing.paper_steps || []).map(step => `<li>${esc(step)}</li>`).join("");
  const portal = county.filing.portal_url ? `<p>Portal: <a href="${esc(county.filing.portal_url)}">${esc(county.filing.portal_url)}</a></p>` : "<p>No portal URL on this adapter.</p>";
  return `${portal}<ol>${steps}</ol><p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>`;
}

function paintFiled(root, matter, county) {
  const lines = planPriceLines(county);
  const fee = lines.fee == null
    ? ""
    : (matter.planId === "dfy" ? lines.dfy : `${lines.diy} ${lines.diyFee}`);
  const auth = matter.agentAuthorization;
  const authLine = auth
    ? `<p>Agent authorization on this appeal: ${esc(auth.doc_title)}, signed by ${esc(auth.signerName)}.</p>
       <p>Parcel: ${esc(auth.parcel || "not stored on this appeal")}.</p>
       <p>Tax years covered: ${esc((auth.taxYears || []).join(", ") || "not stored on this appeal")}. Up to 4.</p>
       <p>${esc(OWNER_COPY_LINE)}</p>
       <p>Date signed: ${esc(signedDateText(auth.signedAt) || "not stored")}. This is the day it was signed. It was not backdated.</p>
       <p>Agent name: ${esc(auth.agentName || AGENT_CONTACT.name)}</p>
       <p>Agent address: ${esc(auth.agentAddress || AGENT_CONTACT.address)}</p>
       <p>Agent phone: ${esc(auth.agentPhone || AGENT_CONTACT.phone)}</p>
       <p>Signed by: ${esc(auth.signerName)}, title ${esc(auth.signerTitle || "not stored")}.</p>
       ${matter.chargeStatus === "card_saved" ? "<p>Your card is saved. You won't be charged until the county confirms your appeal is filed.</p>" : ""}
       <p>${esc(auth.retention || AUTHORIZATION_RETENTION)} Kept until ${esc(auth.retainUntil || "the date three years after signing")}.</p>`
    : `<p>No agent authorization is stored on this appeal.</p>`;
  root.innerHTML = `
    <h1>Filing recorded</h1>
    <p class="lead">Simulated confirmation. The county portal was not contacted.</p>
    <div class="card">
      <p>Filing ID: <b>${esc(matter.filing.id)}</b></p>
      <p>Recorded at: ${esc(matter.filing.filedAt)}</p>
      ${fee ? `<p>${esc(fee)}</p>` : ""}
      <p>Portal: <a href="${esc(matter.filing.portalUrl)}">${esc(matter.filing.portalUrl)}</a></p>
      <p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>
      ${authLine}
    </div>
    ${(county.filing.portal_notes || []).map(note => `<p class="small muted">${esc(note)}</p>`).join("")}
    <div class="cta"><a class="btn" href="dashboard.html">Track the appeal</a></div>`;
}
