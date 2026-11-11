import { deadlineBadge } from "./engine.js";
import { isoDay, parseISODate } from "./format.js";
import { orderCloseLine, orderCutoffIso } from "./offer.js";
import { EMAIL_POSTAL_PLACEHOLDER } from "./caseMail.js";
import { DISCLOSURES_URL } from "./statutoryDisclosure.js";

export const REMINDER_LEAD_DAYS = [14, 7, 2];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysBefore(iso, days) {
  const date = parseISODate(iso);
  if (!date) return "";
  return isoDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - days));
}

/* The subject names Sherwood's order cutoff. It never calls that date the county deadline. */
export function cutoffSubject(county) {
  const iso = orderCutoffIso(county);
  if (!iso) return "";
  if (iso === "2026-11-25") return "Our filing cutoff is Nov 25.";
  const date = parseISODate(iso);
  if (!date) return "";
  return `Our filing cutoff is ${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}.`;
}

export function deadlineReminderPlan(county) {
  if (!county || !county.filing) return [];
  const end = county.filing.regular_window && county.filing.regular_window.end;
  const cutoff = orderCutoffIso(county);
  const countyLine = deadlineBadge(county);
  const closeLine = orderCloseLine(county);
  const rows = [];
  for (const days of REMINDER_LEAD_DAYS) {
    if (cutoff) {
      const subject = cutoffSubject(county);
      rows.push({
        kind: `deadline_cutoff_${days}`,
        anchor: "order_cutoff",
        days,
        sendOn: daysBefore(cutoff, days),
        subject,
        body: [
          subject,
          closeLine,
          countyLine ? `${countyLine}. That is the county filing deadline. Our order cutoff is a different date.` : "This county file does not list a filing deadline.",
          "You asked for these reminders. This message was stored in this browser. It was not sent.",
          "Unsubscribe: unsubscribe.html?token=TOKEN",
          EMAIL_POSTAL_PLACEHOLDER,
          `Disclosures: ${DISCLOSURES_URL}`
        ].join("\n")
      });
    }
    if (end && countyLine) {
      rows.push({
        kind: `deadline_county_${days}`,
        anchor: "county_window",
        days,
        sendOn: daysBefore(end, days),
        subject: countyLine,
        body: [
          `${countyLine}.`,
          closeLine || "This county file does not list an order cutoff.",
          "The order cutoff is when Sherwood stops taking We file it orders. It is not the county filing deadline.",
          "You asked for these reminders. This message was stored in this browser. It was not sent.",
          "Unsubscribe: unsubscribe.html?token=TOKEN",
          EMAIL_POSTAL_PLACEHOLDER,
          `Disclosures: ${DISCLOSURES_URL}`
        ].join("\n")
      });
    }
  }
  return rows.filter(row => row.sendOn && row.subject);
}

export function withUnsubscribe(rows, token) {
  const link = `unsubscribe.html?token=${encodeURIComponent(token || "")}`;
  return rows.map(row => ({
    ...row,
    body: String(row.body || "").replace("unsubscribe.html?token=TOKEN", link)
  }));
}

/* From Nov 21 the review line names our order cutoff, not the county deadline. */
export function borderlineReviewLine(today) {
  const day = today instanceof Date ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : new Date();
  const switchOn = new Date(2026, 10, 21);
  if (day >= switchOn) {
    return "You'll hear from us before Nov 25, or we'll tell you we can't take it this season.";
  }
  return "You'll get an email within 2 business days.";
}
