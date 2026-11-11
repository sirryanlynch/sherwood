import "../boot.js";
import { getCounty } from "../counties.js";
import { contactLine, esc, formatDay } from "../format.js";
import { CASE_EMAIL_KINDS } from "../caseMail.js";
import { authorizationScope, nextActionLine, taxYearLabel } from "../caseStatus.js";
import { preorderDeadlineLabel } from "../offer.js";
import { HEARING_PACKET_LINE } from "../pricing.js";
import { downloadPdf } from "../recordPdf.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("dashboard.html");
if (!gate) {
  /* redirected */
} else {
  const county = await getCounty(gate.matter.countyId);
  paint(gate.matter, gate.user, county);
}

function paint(matter, user, county) {
  const root = document.querySelector("#dashboard");
  const auth = matter.agentAuthorization;
  const filing = matter.filing;
  const years = taxYearLabel(matter);
  const emails = Array.isArray(matter.caseEmails) ? matter.caseEmails : [];
  const emailRows = CASE_EMAIL_KINDS.map(kind => {
    const row = emails.find(item => item.kind === kind);
    const label = kind.replace(/_/g, " ");
    if (!row) return `<li><b>${esc(label)}</b> — Not sent yet.</li>`;
    const who = (row.to || []).join(", ") || "no address on the appeal";
    return `<li><b>${esc(row.subject || label)}</b><p class="small muted">To ${esc(who)} · ${esc(row.at || "")} · simulated, not delivered</p><pre class="card">${esc(row.body || "")}</pre></li>`;
  }).join("");
  const reminders = (matter.deadlineReminders || []).map(row =>
    `<li><b>${esc(row.subject)}</b><p class="small muted">Scheduled ${esc(row.sendOn)} · ${esc(String(row.days))} days before ${row.anchor === "order_cutoff" ? "our order cutoff" : "the county filing deadline"} · ${esc(row.status || "scheduled")} · simulated, not delivered</p><pre class="card">${esc(row.body || "")}</pre></li>`
  ).join("");
  const follow = emails.filter(item => item.kind === "hearing_followup").map(row =>
    `<li><b>${esc(row.subject)}</b><p class="small muted">${esc(row.at || "")}</p><pre class="card">${esc(row.body || "")}</pre></li>`
  ).join("");
  const notices = (matter.notices || []).slice().reverse().map(row =>
    `<article class="card"><p>${esc(row.body)}</p><p class="small muted">${esc(row.note || "")} ${row.suggestion ? `Suggested stage: ${esc(row.suggestion)}.` : ""}</p></article>`
  ).join("");
  const hearingReady = matter.stage === "hearing_scheduled" || (matter.hearingNotice && matter.hearingNotice.sentAt);
  const confirmed = matter.hearingNotice && matter.hearingNotice.confirmedAt;
  const confirm = hearingReady
    ? (confirmed
      ? `<p>You confirmed the hearing notice on ${esc(formatDay(matter.hearingNotice.confirmedAt))}.</p>`
      : `<button class="btn" id="got-notice" type="button">I got my hearing notice</button>`)
    : "";
  const stipulation = matter.stage === "assessor_review" && !matter.stipulationDecision
    ? `<p><a class="btn" href="sign.html?round=3">Accept and sign</a> <button class="btn ghost" id="decline" type="button">Decline</button></p>`
    : (matter.stipulationDecision ? `<p class="small muted">${esc(matter.stipulationDecision)}</p>` : "");
  const advocate = matter.role === "advocate"
    ? `<p class="badge">Family advocate${matter.intake && matter.intake.ownerName ? ` · owner ${esc(matter.intake.ownerName)}` : ""}</p>`
    : "";
  const packetLines = matter.kit && matter.kit.statement
    ? ["Hearing packet preview", "Not a county document.", HEARING_PACKET_LINE, "", matter.kit.statement]
    : ["Hearing packet", "No statement is stored yet. The packet is prepared from the kit you approve.", HEARING_PACKET_LINE];

  root.innerHTML = `
    <h1>Your appeal: ${esc(matter.address)}, tax year ${esc(years)}</h1>
    <p class="lead">${esc(county.county)} (${esc(county.status_label)}). This page is the record. It does not promise proactive status updates. You get an email when a step happens. Status changes when you act, or when ops records a step.</p>
    ${advocate}
    <p class="next-action">${esc(nextActionLine(matter))}</p>
    ${confirm}
    ${stipulation}
    <div class="card">
      <h2>Authorization</h2>
      <p>${esc(authorizationScope(matter))}</p>
      <p>${esc(HEARING_PACKET_LINE)}</p>
      ${auth ? `<button class="btn ghost" type="button" id="dl-auth">Download the signed authorization</button>` : `<p class="small muted">The signed authorization PDF appears here after you sign.</p>`}
    </div>
    <div class="card">
      <h2>Application and county receipt</h2>
      ${filing
        ? `<p>Application filed ${esc(formatDay(filing.filedAt))}. Filing id: <b>${esc(filing.id)}</b>.</p>
           <p>County confirmation: ${esc(filing.countyConfirmedAt || "not recorded")}.</p>
           <p>County reference: ${esc(filing.countyReference || "not recorded")}.</p>
           <p>County receipt: ${esc(filing.countyFeeReceipt || "not recorded")}.</p>`
        : `<p>No filing is stored on this appeal yet. The filing button stays off until the authorization is complete and the agent name, address, and phone are real details rather than [pending].</p>`}
      <p><button class="btn ghost" type="button" id="dl-app">Download the application preview</button>
      ${filing ? `<button class="btn ghost" type="button" id="dl-receipt">Download the county receipt</button>` : ""}</p>
    </div>
    <div class="card">
      <h2>Key dates</h2>
      <ul>
        <li>${esc(preorderDeadlineLabel(county) || "County filing deadline: not set")}</li>
        <li>Filed: ${filing ? esc(formatDay(filing.filedAt)) : "not filed"}</li>
        <li>Hearing: ${matter.hearing && matter.hearing.date ? esc(formatDay(matter.hearing.date)) : "not on this record"}</li>
      </ul>
      <p class="small muted">${esc((county.filing && county.filing.regular_window && county.filing.regular_window.label) || "")}</p>
    </div>
    <div class="card">
      <h2>Hearing packet</h2>
      <p>${esc(HEARING_PACKET_LINE)}</p>
      <button class="btn ghost" type="button" id="dl-packet">Download the hearing packet</button>
    </div>
    <h2>Notices</h2>
    <p class="small muted">Notices you forward are logged by ops and shown here. Nothing on this page edits the appeal.</p>
    ${notices || `<p class="small muted">No notices on this appeal.</p>`}
    <h2>Emails</h2>
    <ol class="email-list">${emailRows}${follow}</ol>
    <h2>Deadline reminders</h2>
    ${reminders ? `<ol class="email-list">${reminders}</ol>` : `<p class="small muted">No deadline reminders. They are stored only after you check Email me reminders. Nothing is sent without that opt-in.</p>`}
    <p class="small muted">Clerk: ${esc(contactLine(county.filing.clerk))}. Signed in as ${esc(user.email)}.</p>`;

  const authBtn = root.querySelector("#dl-auth");
  if (authBtn) authBtn.addEventListener("click", () => {
    downloadPdf("authorization.pdf", [
      "Sherwood authorization record",
      "Simulated. Not a county form.",
      authorizationScope(matter),
      `Document: ${auth.doc_title || ""}`,
      `Agent: ${auth.agentName || ""}`,
      `Address: ${auth.agentAddress || ""}`,
      `Phone: ${auth.agentPhone || ""}`,
      "You get a copy of everything filed."
    ]);
  });
  root.querySelector("#dl-app").addEventListener("click", () => {
    downloadPdf("application-preview.pdf", [
      "Application preview",
      matter.address || "",
      filing ? `Filing id: ${filing.id}` : "Not filed.",
      "",
      (matter.kit && matter.kit.statement) || "No statement of facts is stored yet."
    ]);
  });
  const receiptBtn = root.querySelector("#dl-receipt");
  if (receiptBtn) receiptBtn.addEventListener("click", () => {
    downloadPdf("county-receipt.pdf", [
      "County receipt record",
      "Simulated. The county portal was not contacted.",
      `Filing id: ${filing.id}`,
      `Filed: ${filing.filedAt || ""}`,
      `County reference: ${filing.countyReference || "not recorded"}`,
      `County receipt: ${filing.countyFeeReceipt || "not recorded"}`,
      `County confirmation: ${filing.countyConfirmedAt || "not recorded"}`,
      filing.feeLabel || ""
    ]);
  });
  root.querySelector("#dl-packet").addEventListener("click", () => downloadPdf("hearing-packet.pdf", packetLines));
  const got = root.querySelector("#got-notice");
  if (got) got.addEventListener("click", () => {
    matter.hearingNotice = matter.hearingNotice || { sentAt: null, followUpSent: false };
    matter.hearingNotice.confirmedAt = new Date().toISOString();
    saveMatter(matter);
    paint(matter, user, county);
  });
  const decline = root.querySelector("#decline");
  if (decline) decline.addEventListener("click", () => {
    matter.stipulationDecision = "Declined. You decided not to accept a stipulation. No document was signed.";
    saveMatter(matter);
    paint(matter, user, county);
  });
}
