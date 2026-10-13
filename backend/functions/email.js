const { STATUTORY_DISCLOSURE, statutoryDisclosureHtml } = require("./disclosure");

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

const DISCLOSURE_PX = 34;
const HEADING_PX = 20;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function buildEmail({ kind, countyName, windowLabel, windowStart, windowEnd, confirmUrl, unsubscribeUrl, cancelUrl, postal, outcome }) {
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
    lines.push("No window reminder is sent until you confirm.");
  } else if (kind === "heads_up_14") {
    heading = `Filing window reminder for ${name}`;
    lines.push(`About 14 days remain before the filing window on the ${name} adapter${windowStart ? ` (${windowStart})` : ""}.`);
    if (windowLabel) lines.push(windowLabel);
  } else if (kind === "open_day") {
    heading = `The filing window is open for ${name}`;
    lines.push(`The filing window on the ${name} adapter is open.`);
    if (windowLabel) lines.push(windowLabel);
    if (windowEnd) lines.push(`The adapter deadline is ${windowEnd}.`);
  } else if (kind === "deadline_14") {
    heading = `Filing deadline reminder for ${name}`;
    lines.push(`About 14 days remain before the filing deadline on the ${name} adapter${windowEnd ? ` (${windowEnd})` : ""}.`);
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
  const body = lines.join("\n");
  const text = [
    STATUTORY_DISCLOSURE, "", heading, "", body, "", String(postal).trim(), `Unsubscribe: ${unsubscribeUrl}`
  ].join("\n");
  const html = [
    `<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:#111">`,
    statutoryDisclosureHtml(),
    `<h1 style="font-size:${HEADING_PX}px;line-height:1.35;font-weight:700;margin:0 0 32px">${escapeHtml(heading)}</h1>`,
    ...lines.map(line => `<p style="font-size:16px;line-height:1.5;margin:0 0 12px">${escapeHtml(line)}</p>`),
    `<p style="font-size:16px;line-height:1.5;margin:24px 0 0">${escapeHtml(String(postal).trim())}</p>`,
    `<p style="font-size:16px;line-height:1.5;margin:12px 0 0">Unsubscribe: ${escapeHtml(unsubscribeUrl)}</p>`,
    `</div>`
  ].join("");
  const subject = heading;
  return { subject, text, html, disclosurePx: DISCLOSURE_PX, headingPx: HEADING_PX };
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

module.exports = { sendingConfig, buildEmail, deliver, REMINDER_KINDS };
