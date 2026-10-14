const { logoHtml, DISCLOSURES_URL, H1_PX, BODY_PX, ORDER_CLOSE_SENTENCE } = require("./disclosure");

const REMINDER_KINDS = new Set(["confirm", "heads_up_14", "open_day", "deadline_14"]);

function usable(value) {
  const text = String(value || "").trim();
  if (!text || text === "unused") return "";
  return text;
}

function sendingConfig(env = process.env) {
  const postal = String(env.MAIL_POSTAL_ADDRESS || "").trim();
  const from = String(env.MAIL_FROM || "").trim();
  const base = String(env.PUBLIC_FUNCTIONS_BASE_URL || "").trim().replace(/\/$/, "");
  const resend = usable(env.RESEND_API_KEY);
  const missing = [];
  if (!postal) missing.push("MAIL_POSTAL_ADDRESS");
  if (!from) missing.push("MAIL_FROM");
  if (!base) missing.push("PUBLIC_FUNCTIONS_BASE_URL");
  if (!resend) missing.push("RESEND_API_KEY");
  return { ok: missing.length === 0, missing, postal, from, base, resend };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function calendarParts(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatShortDay(iso) {
  const parts = calendarParts(iso);
  if (!parts) return "";
  return `${SHORT_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

function daysBetween(fromIso, toIso) {
  const from = calendarParts(fromIso);
  const to = calendarParts(toIso);
  if (!from || !to) return null;
  const ms = Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day);
  return Math.round(ms / 86400000);
}

/* Fixed county date. No remaining-day count. */
function deadlineLine(windowEnd) {
  const label = formatShortDay(windowEnd);
  if (!label) return "";
  return `County filing deadline: ${label}`;
}

function openingLine(name, windowStart) {
  const label = formatShortDay(windowStart);
  if (!label) return windowStart ? `The adapter opening date is ${windowStart}.` : "";
  return `The filing window on the ${name} adapter opens ${label}.`;
}

function buildEmail({ kind, countyName, windowLabel, windowStart, windowEnd, confirmUrl, unsubscribeUrl, cancelUrl, postal, outcome, today }) {
  if (!String(postal || "").trim()) {
    throw new Error("MAIL_POSTAL_ADDRESS is required before sending");
  }
  if (!unsubscribeUrl) throw new Error("Unsubscribe link is required");
  const name = countyName || "your county";
  const lines = [];
  let heading = "";
  if (kind === "confirm") {
    heading = `Confirm your ${name} filing reminder`;
    lines.push(`Confirm that you want filing-window reminders for ${name}.`);
    if (windowStart) lines.push(`The adapter opening date is ${windowStart}.`);
    else lines.push("This county adapter does not state an opening date.");
    if (confirmUrl) lines.push(`Confirm: ${confirmUrl}`);
    const confirmDeadline = deadlineLine(windowEnd);
    if (confirmDeadline) lines.push(confirmDeadline);
    lines.push("No window reminder is sent until you confirm.");
  } else if (kind === "heads_up_14") {
    heading = `Filing window reminder for ${name}`;
    const opening = openingLine(name, windowStart);
    if (opening) lines.push(opening);
    const deadline = deadlineLine(windowEnd);
    if (deadline) lines.push(deadline);
    if (windowLabel) lines.push(windowLabel);
  } else if (kind === "open_day") {
    heading = `The filing window is open for ${name}`;
    lines.push(`The filing window on the ${name} adapter is open.`);
    if (windowLabel) lines.push(windowLabel);
    const deadline = deadlineLine(windowEnd);
    if (deadline) lines.push(deadline);
    else if (windowEnd) lines.push(`The adapter deadline is ${windowEnd}.`);
  } else if (kind === "deadline_14") {
    heading = `Filing deadline reminder for ${name}`;
    lines.push(deadlineLine(windowEnd) || `The filing deadline on the ${name} adapter is not set.`);
    if (windowLabel) lines.push(windowLabel);
  } else if (kind === "renewal") {
    heading = `Annual monitor renewal notice for ${name}`;
    lines.push("Your annual monitor will renew unless you cancel.");
    lines.push("The renewal price is $49 for another year.");
    lines.push("This notice is sent 15 to 45 days before the renewal date.");
    if (cancelUrl) lines.push(`Cancel online: ${cancelUrl}`);
  } else if (kind === "monitor_confirm") {
    heading = "Annual monitor confirmation";
    lines.push("You agreed to the annual monitor at $49 a year.");
    lines.push("The annual monitor costs $49 and renews automatically each year until you cancel. You can cancel online in one click before the renewal date. Sherwood emails a renewal notice 15 to 45 days before the renewal.");
    lines.push("This confirmation is yours to keep.");
    if (cancelUrl) lines.push(`Cancel online: ${cancelUrl}`);
  } else if (kind === "result") {
    heading = "Your Sherwood check";
    lines.push(`Your check for ${name} was saved${outcome ? ` (${outcome})` : ""}.`);
    lines.push("That result is an estimate from numbers you entered. It is not a decision.");
  } else {
    throw new Error("Unknown email kind");
  }
  lines.push(ORDER_CLOSE_SENTENCE);
  const body = lines.join("\n");
  const text = [
    heading, "", body, "", String(postal).trim(), `Disclosures: ${DISCLOSURES_URL}`, `Unsubscribe: ${unsubscribeUrl}`
  ].join("\n");
  const html = [
    `<style>html,body{font-size:${BODY_PX}px}</style>`,
    `<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:#111;font-size:${BODY_PX}px;line-height:1.5">`,
    logoHtml(),
    `<h1 style="font-size:${H1_PX}px;line-height:1.3;font-weight:700;margin:0 0 32px">${escapeHtml(heading)}</h1>`,
    ...lines.map(line => `<p style="font-size:${BODY_PX}px;line-height:1.5;margin:0 0 12px">${escapeHtml(line)}</p>`),
    `<p style="font-size:${BODY_PX}px;line-height:1.5;margin:24px 0 0">${escapeHtml(String(postal).trim())}</p>`,
    `<p style="font-size:${BODY_PX}px;line-height:1.5;margin:12px 0 0"><a href="${DISCLOSURES_URL}">Disclosures</a></p>`,
    `<p style="font-size:${BODY_PX}px;line-height:1.5;margin:12px 0 0">Unsubscribe: ${escapeHtml(unsubscribeUrl)}</p>`,
    `</div>`
  ].join("");
  const subject = heading;
  return { subject, text, html, headingPx: H1_PX };
}

async function deliver({ to, subject, text, html }, env = process.env, fetchImpl = fetch) {
  const cfg = sendingConfig(env);
  if (!cfg.ok) {
    const err = new Error(`${cfg.missing.join(", ")} required before sending`);
    err.code = "not_configured";
    throw err;
  }
  if (!text.includes(cfg.postal)) throw new Error("Email is missing the postal address");
  if (!/Unsubscribe:\s+\S+/.test(text)) throw new Error("Email is missing an unsubscribe link");
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, text, html })
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}`);
  return { provider: "resend" };
}

module.exports = { sendingConfig, buildEmail, deliver, REMINDER_KINDS, daysBetween, deadlineLine };
