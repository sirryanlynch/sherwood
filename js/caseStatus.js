import { formatDay, isoDay } from "./format.js";
import { hearingFollowUpDraft, sendCaseEmail } from "./caseMail.js";

const STAGES = ["filed", "acknowledged", "assessor_review", "hearing_scheduled", "decision", "refund", "monitor"];

export function taxYearLabel(matter) {
  const years = matter && matter.agentAuthorization && matter.agentAuthorization.taxYears;
  if (Array.isArray(years) && years.length) return years.join(", ");
  return "not signed yet";
}

export function authorizationScope(matter) {
  const auth = matter && matter.agentAuthorization;
  if (!auth || !auth.signedAt) return "No signed authorization is stored on this appeal yet.";
  const years = Array.isArray(auth.taxYears) && auth.taxYears.length
    ? auth.taxYears.map(year => String(year)).join("; ")
    : "not stored";
  return `Signed ${formatDay(auth.signedAt)} by ${auth.signerName || "the signer"}, title ${auth.signerTitle || "not stored"}. Property: ${auth.parcel || matter.address || "the parcel"}. Tax years, each listed: ${years}. The filing year and earlier years, four at most. Filing only. The named agent does not attend the hearing.`;
}

/* One line. The hearing line wins when a hearing is on the record. */
export function nextActionLine(matter) {
  if (!matter) return "We're preparing your filing.";
  if (matter.stage === "hearing_scheduled" || (matter.hearing && (matter.hearing.date || matter.hearing.simulated))) {
    if (matter.hearing && matter.hearing.date) {
      return `You attend the hearing on ${formatDay(matter.hearing.date)}. Your packet is below.`;
    }
    return "You attend the hearing. A date is not on this record yet. Your packet is below.";
  }
  if (matter.authority === "poa" && !matter.poaReviewed) {
    return "A person is checking the power of attorney or conservatorship before filing.";
  }
  if (matter.outcome === "borderline" && !matter.reviewed) {
    return "A person is reviewing your numbers. Filing stays off until that review is marked.";
  }
  if (matter.stage === "assessor_review" && !matter.stipulationDecision) {
    return "Your move: you decide whether to accept a stipulation.";
  }
  const signed = matter.agentAuthorization && matter.agentAuthorization.signedAt;
  if (!signed && matter.authority !== "poa") return "Your move: sign the authorization.";
  if (!matter.filing) return "We're preparing your filing.";
  return "Filed. Waiting on the county.";
}

export function advanceMatter(matter, county) {
  const stage = STAGES.includes(matter.stage) ? matter.stage : null;
  if (stage === "monitor") return { advanced: false, emailKind: null, blocked: "" };
  if (stage === "assessor_review" && !matter.stipulationDecision && !(matter.signatures && matter.signatures.stipulation)) {
    return { advanced: false, emailKind: null, blocked: "Accept or decline the stipulation preview before advancing." };
  }
  const idx = stage ? STAGES.indexOf(stage) : -1;
  const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
  if (stage === next) return { advanced: false, emailKind: null, blocked: "" };
  matter.stage = next;
  matter.stageHistory = Array.isArray(matter.stageHistory) ? matter.stageHistory : [];
  matter.stageHistory.push({ stage: next, at: new Date().toISOString(), simulated: true });
  let emailKind = null;
  if (next === "hearing_scheduled") {
    const minDays = county && county.hearing && county.hearing.notice_minimum_days;
    if (typeof minDays === "number") {
      const date = new Date();
      date.setDate(date.getDate() + minDays);
      matter.hearing = { date: isoDay(date), simulated: true, minimumDays: minDays };
    } else {
      matter.hearing = { date: null, simulated: true, note: "Your county's rules have no minimum notice period, so no preview date was invented." };
    }
    emailKind = "hearing_scheduled";
  }
  if (next === "decision") emailKind = "decision";
  return { advanced: true, emailKind, blocked: "" };
}

export async function logHearingFollowUp(matter, county) {
  const notice = matter.hearingNotice;
  if (!notice || notice.confirmedAt || notice.followUpSent) return { sent: false };
  const draft = hearingFollowUpDraft(matter);
  await sendCaseEmail(draft.kind, matter, county);
  matter.hearingNotice.followUpSent = true;
  matter.hearingNotice.followUpAt = new Date().toISOString();
  matter.hearingNotice.log = "One follow-up stored. No further follow-up is sent from this demo.";
  return { sent: true };
}
