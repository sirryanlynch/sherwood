import { CONFIG } from "./config.js";
import { deadlineBadge, filingWindow } from "./engine.js";
import { esc, isoDay, parseISODate } from "./format.js";

export const EFILE_LEAD_DAYS = 3;
export const PAPER_LEAD_DAYS = 7;
export const ORDER_CUTOFF_LEAD_DAYS = 5;

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

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Santa Cruz uses order_cutoff. Every other county closes We file it orders
   5 days before regular_window.end. The cutoff day itself is still open. */
export function orderCutoffIso(county) {
  if (county && county.id === "santa_cruz") {
    const iso = String(CONFIG.order_cutoff || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  }
  const endIso = county && county.filing && county.filing.regular_window && county.filing.regular_window.end;
  const end = parseISODate(endIso);
  if (!end) return "";
  const cutoff = new Date(end.getFullYear(), end.getMonth(), end.getDate() - ORDER_CUTOFF_LEAD_DAYS);
  return isoDay(cutoff);
}

/* True after the cutoff calendar day. The cutoff day itself is still open. */
export function pastOrderCutoff(county, today) {
  const cutoff = parseISODate(orderCutoffIso(county));
  if (!cutoff || !(today instanceof Date)) return false;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return day > cutoff;
}

export const ORDER_CLOSE_SENTENCE = "Orders for us to file close Nov 25, 2026.";

/* A fixed date. No ticking countdown. Nov 25, 2026 uses the published sentence. */
export function orderCloseLine(county) {
  const iso = orderCutoffIso(county);
  const cutoff = parseISODate(iso);
  if (!cutoff) return "";
  if (iso === "2026-11-25") return ORDER_CLOSE_SENTENCE;
  return `Orders for us to file close ${SHORT_MONTHS[cutoff.getMonth()]} ${cutoff.getDate()}, ${cutoff.getFullYear()}.`;
}

export function orderBadgeHtml(county) {
  const deadline = deadlineBadge(county);
  const close = orderCloseLine(county);
  return [
    deadline ? `<p class="badge">${esc(deadline)}</p>` : "",
    close ? `<p class="badge">${esc(close)}</p>` : ""
  ].join("");
}

export function landingDfyEnabled(county) {
  const flags = CONFIG.LANDING_DFY;
  if (!flags || !county || !Object.prototype.hasOwnProperty.call(flags, county.id)) return true;
  return flags[county.id] === true;
}

/* County fee is too large for the current We file it price. Stays off after confirmation. */
export function marginBlocksDfy(county) {
  return !!(county && county.wefile_margin_block === true);
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
  const day = today || new Date();
  const lead = open && season.kind === "regular" && withinDfyLead(county, day);
  const cutoff = open && pastOrderCutoff(county, day);
  const landingOff = !landingDfyEnabled(county);
  const margin = marginBlocksDfy(county);
  const losAngeles = !!(county && county.id === "los_angeles");
  let diy = open && verified;
  let dfy = open && verified && !paper && !registration && !lead && !cutoff && !landingOff && !margin;
  if (open && losAngeles) {
    diy = true;
    dfy = !paper && !registration && !lead && !cutoff && !landingOff && !margin;
  }
  if (!verified && !losAngeles) {
    diy = false;
    dfy = false;
  }
  if (!open || paper || registration || lead || cutoff || landingOff || margin) dfy = false;
  if (!open) diy = false;
  return {
    diy,
    dfy,
    reminder: !diy && !dfy,
    paper,
    registration,
    lead,
    cutoff,
    landingOff,
    margin,
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
  if (offer.cutoff && !offer.dfy) {
    return orderCloseLine(county) || "Orders for us to file are closed.";
  }
  if (offer.landingOff && !offer.dfy) {
    return "We file it stays off for this county until that switch is turned on.";
  }
  if (offer.margin && !offer.dfy) {
    return "We file it stays off in this county until the price changes.";
  }
  if (offer.lead && !offer.dfy) {
    return "We file it checkout is closed for the last days of this window so there is time to finish signing.";
  }
  return "";
}
