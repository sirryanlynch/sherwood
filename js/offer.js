import { CONFIG } from "./config.js";
import { deadlineBadge, filingWindow } from "./engine.js";
import { esc, parseISODate } from "./format.js";

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

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Santa Cruz product cutoff. Other counties do not use this date. */
export function orderCutoffIso(county) {
  if (!county || county.id !== "santa_cruz") return "";
  const iso = String(CONFIG.order_cutoff || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
}

/* True after the cutoff calendar day. The cutoff day itself is still open. */
export function pastOrderCutoff(county, today) {
  const cutoff = parseISODate(orderCutoffIso(county));
  if (!cutoff || !(today instanceof Date)) return false;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return day > cutoff;
}

export function orderCloseLine(county) {
  const cutoff = parseISODate(orderCutoffIso(county));
  if (!cutoff) return "";
  return `We file it orders close ${SHORT_MONTHS[cutoff.getMonth()]} ${cutoff.getDate()}`;
}

/* Remaining time until the end of the cutoff day. Computed from `now`. */
export function orderCountdownText(iso, now) {
  const cutoff = parseISODate(iso);
  if (!cutoff || !(now instanceof Date) || Number.isNaN(now.getTime())) return "";
  const end = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1);
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return "We file it orders are closed.";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const part = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return `${part(days, "day")}, ${part(hours, "hour")}, ${part(minutes, "minute")}, ${part(seconds, "second")}`;
}

export function orderBadgeHtml(county) {
  const deadline = deadlineBadge(county);
  const close = orderCloseLine(county);
  const iso = orderCutoffIso(county);
  return [
    deadline ? `<p class="badge">${esc(deadline)}</p>` : "",
    close ? `<p class="badge">${esc(close)}</p>` : "",
    iso ? `<p class="badge" data-order-countdown="${esc(iso)}"></p>` : ""
  ].join("");
}

const countdownTimers = new WeakMap();

export function mountOrderCountdowns(root) {
  const scope = root && root.querySelectorAll ? root : (typeof document !== "undefined" ? document : null);
  if (!scope) return;
  const nodes = [...scope.querySelectorAll("[data-order-countdown]")];
  if (!nodes.length) return;
  const tick = () => {
    const now = new Date();
    nodes.forEach(el => {
      el.textContent = orderCountdownText(el.getAttribute("data-order-countdown"), now);
    });
  };
  tick();
  const prev = countdownTimers.get(scope);
  if (prev) clearInterval(prev);
  countdownTimers.set(scope, setInterval(tick, 1000));
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
    const line = orderCloseLine(county);
    return line ? `${line}.` : "We file it orders are closed.";
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
