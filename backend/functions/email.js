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

function buildEmail({ kind, countyName, windowLabel, windowStart, windowEnd, confirmUrl, unsubscribeUrl, postal, outcome }) {
  if (!String(postal || "").trim()) {
    throw new Error("MAIL_POSTAL_ADDRESS is required before sending");
  }
  if (!unsubscribeUrl) throw new Error("Unsubscribe link is required");
  const name = countyName || "your county";
  const lines = [];
  if (kind === "confirm") {
    lines.push(`Confirm that you want filing-window reminders for ${name}.`);
    if (windowStart) lines.push(`The adapter opening date is ${windowStart}.`);
    else lines.push("This county adapter does not state an opening date.");
    if (confirmUrl) lines.push(`Confirm: ${confirmUrl}`);
    lines.push("No window reminder is sent until you confirm.");
  } else if (kind === "heads_up_14") {
    lines.push(`About 14 days remain before the filing window on the ${name} adapter${windowStart ? ` (${windowStart})` : ""}.`);
    if (windowLabel) lines.push(windowLabel);
  } else if (kind === "open_day") {
    lines.push(`The filing window on the ${name} adapter is open.`);
    if (windowLabel) lines.push(windowLabel);
    if (windowEnd) lines.push(`The adapter deadline is ${windowEnd}.`);
  } else if (kind === "deadline_14") {
    lines.push(`About 14 days remain before the filing deadline on the ${name} adapter${windowEnd ? ` (${windowEnd})` : ""}.`);
    if (windowLabel) lines.push(windowLabel);
  } else if (kind === "result") {
    lines.push(`Your check for ${name} was saved${outcome ? ` (${outcome})` : ""}.`);
    lines.push("That result is an estimate from numbers you entered. It is not a decision.");
  } else {
    throw new Error("Unknown email kind");
  }
  lines.push("");
  lines.push("Sherwood is not a law firm and this email is not legal advice.");
  lines.push(String(postal).trim());
  lines.push(`Unsubscribe: ${unsubscribeUrl}`);
  const subject = {
    confirm: `Confirm your ${name} filing reminder`,
    heads_up_14: `Filing window reminder for ${name}`,
    open_day: `The filing window is open for ${name}`,
    deadline_14: `Filing deadline reminder for ${name}`,
    result: "Your Sherwood check"
  }[kind];
  return { subject, text: lines.join("\n") };
}

async function deliver({ to, subject, text }, env = process.env, fetchImpl = fetch) {
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
    body: JSON.stringify({ from: cfg.from, to: [to], subject, text })
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}`);
  return { provider: "resend" };
}

module.exports = { sendingConfig, buildEmail, deliver };
