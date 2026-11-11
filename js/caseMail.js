import { notify } from "./adapters/notify.js";
import { HEARING_PACKET_LINE, HEARING_STATEMENT } from "./pricing.js";

export const CASE_EMAIL_KINDS = ["received", "signed", "filed", "hearing_scheduled", "decision"];

export function emailRecipients(matter) {
  const list = [];
  const add = value => {
    const email = String(value || "").trim();
    if (email && !list.includes(email)) list.push(email);
  };
  add(matter && matter.email);
  const intake = matter && matter.intake;
  if (intake) {
    add(intake.email);
    add(intake.ownerEmail);
    add(intake.advocateEmail);
  }
  return list;
}

function scopeLine(matter) {
  const auth = matter && matter.agentAuthorization;
  if (!auth) return "The authorization is not signed yet.";
  const years = Array.isArray(auth.taxYears) && auth.taxYears.length ? auth.taxYears.join(", ") : "not stored";
  return `Signed by ${auth.signerName || "the signer"}. Property: ${auth.parcel || matter.address || "the parcel"}. Tax years: ${years}. Filing only. The named agent does not attend the hearing.`;
}

export function caseEmailDraft(kind, matter, county) {
  const address = (matter && matter.address) || "your property";
  const countyName = (county && county.county) || "your county";
  const filingId = matter && matter.filing && matter.filing.id ? matter.filing.id : "not set";
  const hearingDate = matter && matter.hearing && matter.hearing.date ? matter.hearing.date : "a date the county sets";
  const subjects = {
    received: `We received your appeal for ${address}`,
    signed: `Authorization signed for ${address}`,
    filed: `Filed: ${address}`,
    hearing_scheduled: `Hearing scheduled for ${address}`,
    decision: `Decision step for ${address}`
  };
  const bodies = {
    received: [
      `We received your request to file an appeal for ${address} in ${countyName}.`,
      "You review and sign. We do the paperwork and the deadline.",
      "Your card is saved and is not charged until the county confirms the filing.",
      "If we decide not to file after intake, you pay nothing.",
      "This message was stored in this browser. It was not sent to an email provider."
    ].join("\n"),
    signed: [
      `The authorization for ${address} is signed.`,
      scopeLine(matter),
      HEARING_PACKET_LINE,
      "This message was stored in this browser. It was not sent to an email provider."
    ].join("\n"),
    filed: [
      `A filing record is stored for ${address}.`,
      `Filing id: ${filingId}.`,
      "Attached in this demo: authorization.pdf and application-preview.pdf.",
      "The county portal was not contacted.",
      "Your card is still not charged. The charge waits until the county confirms the filing.",
      "This message was stored in this browser. It was not sent to an email provider."
    ].join("\n"),
    hearing_scheduled: [
      `A hearing step is on your case for ${address}.`,
      `Hearing date on this record: ${hearingDate}.`,
      HEARING_PACKET_LINE,
      "Confirm on your case page that you got this notice. We send one follow-up if you do not confirm, then we log it.",
      "This message was stored in this browser. It was not sent to an email provider."
    ].join("\n"),
    decision: [
      `A decision step is on your case for ${address}.`,
      (matter && matter.decisionNote) || "No county decision is loaded. This demo does not invent one.",
      HEARING_STATEMENT,
      "If the assessor offers a settlement, you decide whether to accept it.",
      "This message was stored in this browser. It was not sent to an email provider."
    ].join("\n")
  };
  return {
    kind,
    subject: subjects[kind] || kind,
    body: bodies[kind] || "",
    attachments: kind === "filed" ? ["authorization.pdf", "application-preview.pdf"] : []
  };
}

export const HEARING_FOLLOWUP_KIND = "hearing_followup";

export function hearingFollowUpDraft(matter) {
  const address = (matter && matter.address) || "your property";
  return {
    kind: HEARING_FOLLOWUP_KIND,
    subject: `Did you get the hearing notice for ${address}?`,
    body: [
      "This is the one follow-up.",
      "Confirm on your case page that you got the hearing notice.",
      "You attend the hearing. We prepare the packet.",
      "This message was stored in this browser. It was not sent to an email provider."
    ].join("\n"),
    attachments: []
  };
}

export async function sendCaseEmail(kind, matter, county) {
  const draft = kind === HEARING_FOLLOWUP_KIND ? hearingFollowUpDraft(matter) : caseEmailDraft(kind, matter, county);
  const recipients = emailRecipients(matter);
  const to = recipients.length ? recipients : [];
  matter.caseEmails = Array.isArray(matter.caseEmails) ? matter.caseEmails : [];
  const at = new Date().toISOString();
  for (const email of to) {
    await notify.outbox({
      channel: "email",
      to: email,
      kind: draft.kind,
      subject: draft.subject,
      attachments: draft.attachments,
      simulated: true,
      body: `${draft.subject}\n\n${draft.body}`
    });
  }
  matter.caseEmails.push({ ...draft, to, at, simulated: true });
  if (draft.kind === "hearing_scheduled") {
    matter.hearingNotice = {
      sentAt: at,
      followUpSent: false,
      confirmedAt: matter.hearingNotice && matter.hearingNotice.confirmedAt || null
    };
  }
  return matter.caseEmails;
}
