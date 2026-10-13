import { filingWindow } from "./engine.js";
import { parseISODate } from "./format.js";

export const EFILE_LEAD_DAYS = 3;
export const PAPER_LEAD_DAYS = 7;

export function paperFiling(county) {
  const filing = county && county.filing;
  if (!filing) return false;
  return filing.efile === false || filing.wet_signature_required === true || filing.dfy_available === false;
}

export function registrationBlocksDfy(county) {
  const agent = county && county.agent;
  if (!agent || agent.registration_required !== true) return false;
  return agent.registration_status !== "active";
}

/* Last days of a regular window are too late to finish signing. */
export function withinDfyLead(county, today) {
  const endIso = county && county.filing && county.filing.regular_window && county.filing.regular_window.end;
  const end = parseISODate(endIso);
  if (!end || !(today instanceof Date)) return false;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lead = paperFiling(county) ? PAPER_LEAD_DAYS : EFILE_LEAD_DAYS;
  const cutoff = new Date(end.getFullYear(), end.getMonth(), end.getDate() - lead);
  return day >= cutoff;
}

export function purchaseOffer(county, today, supplementalNoticeDate) {
  const season = filingWindow(county, today || new Date(), supplementalNoticeDate);
  const open = season.state === "open";
  const verified = !!(county && county.status === "verified");
  const paper = paperFiling(county);
  const registration = registrationBlocksDfy(county);
  const lead = open && season.kind === "regular" && withinDfyLead(county, today || new Date());
  const losAngeles = !!(county && county.id === "los_angeles");
  let diy = open && verified;
  let dfy = open && verified && !paper && !registration && !lead;
  if (open && losAngeles) {
    diy = true;
    dfy = !paper && !registration && !lead;
  }
  if (!verified && !losAngeles) {
    diy = false;
    dfy = false;
  }
  if (!open || paper || registration || lead) dfy = false;
  if (!open) diy = false;
  return {
    diy,
    dfy,
    reminder: !diy && !dfy,
    paper,
    registration,
    lead,
    closed: !open,
    informal: !open,
    verified,
    losAngeles,
    season
  };
}

export function offerMessage(county, offer) {
  if (!offer) return "";
  if (offer.closed) return "";
  if (offer.losAngeles && offer.registration && offer.diy) {
    return "We file it stays off until Los Angeles tax-agent registration is active. The DIY kit is available. A reminder is available too.";
  }
  if (offer.paper) {
    return "We file it is not available in this county yet. A typed signature is not valid on a paper filing. Leave your email for a reminder.";
  }
  if (offer.registration) {
    return "We file it stays off until agent registration for this county is active. Leave your email for a reminder.";
  }
  if (!offer.verified) {
    return "This county file is unconfirmed. Sherwood is not selling We file it here. Leave your email for a reminder.";
  }
  if (offer.lead && !offer.dfy) {
    return "We file it checkout is closed for the last days of this window so there is time to finish signing.";
  }
  return "";
}
