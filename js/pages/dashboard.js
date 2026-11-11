import "../boot.js";
import { customerCountyLine, getCounty } from "../counties.js";
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
  const emailLabels = {
    received: "Received",
    signed: "Signed",
    filed: "Filed",
    hearing_scheduled: "Hearing scheduled",
    decision: "Decision"
  };
  const emailItems = CASE_EMAIL_KINDS.map(kind => {
    const row = emails.find(item => item.kind === kind);
    const label = emailLabels[kind] || kind;
    if (!row) return { sent: false, at: "", html: `<li><b>${esc(label)}</b> — Not sent yet.</li>` };
    const who = (row.to || []).join(", ") || "no address on the appeal";
    return {
      sent: true,
      at: row.at || "",
      html: `<li><b>${esc(row.subject || label)}</b><p class="small muted">To ${esc(who)} · ${esc(row.at || "")} · simulated, not delivered</p><pre class="card">${esc(row.body || "")}</pre></li>`
    };
  });
  const latestSent = emailItems.filter(item => item.sent).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
  const otherEmails = emailItems.filter(item => item !== latestSent).map(item => item.html).join("");
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

  const heading = years === "not signed yet"
    ? "Your appeal: waiting for your signature."
    : `Your appeal: ${esc(matter.address)}, tax year ${esc(years)}`;
  const countyLine = customerCountyLine(county);
  const unsigned = years === "not signed yet";
  const next = unsigned
    ? `<div class="card next-card"><p class="eyebrow">Your move</p><p class="next-title">${esc(nextActionLine(matter))}</p><p><a class="btn" href="sign.html">Sign the authorization</a></p></div>`
    : `<p class="next-action">${esc(nextActionLine(matter))}</p>`;
  const authStatus = auth ? "Signed" : "The signed authorization PDF appears here after you sign.";
  const appStatus = filing
    ? `Filed ${formatDay(filing.filedAt)}. Filing id ${filing.id}.`
    : "No filing is stored yet. The filing button stays off until the authorization is complete and the agent name, address, and phone are real details rather than [pending].";
  root.innerHTML = `
    <h1>${heading}</h1>
    <p class="lead">${esc(countyLine || county.county + " County")}. This page is the record. It does not promise proactive status updates. You get an email when a step happens. Status changes when you act, or when ops records a step.</p>
    ${advocate}
    ${next}
    ${confirm}
    ${stipulation}
    <div class="split">
      <div class="record">
        <div class="card">
          <h2>Documents</h2>
          <ul class="doc-list">
            <li class="doc-row"><b>Authorization</b><span class="small muted">${esc(authStatus)}</span>${auth ? `<button class="link" type="button" id="dl-auth">Download</button>` : ""}</li>
            <li class="doc-row"><b>Application and county receipt</b><span class="small muted">${esc(appStatus)}</span><button class="link" type="button" id="dl-app">Download</button>${filing ? `<button class="link" type="button" id="dl-receipt">Download the receipt</button>` : ""}</li>
            <li class="doc-row"><b>Hearing packet</b><span class="small muted">${esc(HEARING_PACKET_LINE)}</span><button class="link" type="button" id="dl-packet">Download</button></li>
          </ul>
          <p>${esc(authorizationScope(matter))}</p>
          ${filing
            ? `<p>County confirmation: ${esc(filing.countyConfirmedAt || "not recorded")}. County reference: ${esc(filing.countyReference || "not recorded")}. County receipt: ${esc(filing.countyFeeReceipt || "not recorded")}.</p>`
            : ""}
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
        <h2>Notices</h2>
        <p class="small muted">Notices you forward are logged by ops and shown here. Nothing on this page edits the appeal.</p>
        ${notices || `<p class="small muted">No notices on this appeal.</p>`}
      </div>
      <aside class="messages">
        <h2>Emails</h2>
        ${latestSent ? `<ol class="email-list">${latestSent.html}</ol>` : `<p class="small muted">None sent yet.</p>`}
        <details><summary>Show all ${emailItems.length} emails</summary><ol class="email-list">${otherEmails}${follow}</ol></details>
        <h2>Deadline reminders</h2>
        ${reminders ? `<ol class="email-list">${reminders}</ol>` : `<p class="small muted">No deadline reminders. They are stored only after you check Email me reminders. Nothing is sent without that opt-in.</p>`}
        <p class="small muted">Clerk: ${esc(contactLine(county.filing.clerk))}. Signed in as ${esc(user.email)}.</p>
      </aside>
    </div>`;

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
