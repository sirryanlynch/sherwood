import { backendEnabled, functionsUrl } from "./config.js";

function remember(kind, row) {
  const key = kind === "lead" ? "sherwood_leads" : "sherwood_reminders";
  const all = JSON.parse(localStorage.getItem(key) || "[]");
  all.push(row);
  localStorage.setItem(key, JSON.stringify(all));
}

async function post(name, body) {
  const res = await fetch(functionsUrl(name), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || "Request failed." };
  return { ok: true, ...data };
}

export async function createReminder(input) {
  const row = {
    email: input.email,
    county_slug: input.county_slug || null,
    address: input.address || null,
    marketing_consent: true,
    consent_source: input.consent_source,
    requestedAt: new Date().toISOString()
  };
  remember("reminder", row);
  if (!backendEnabled()) return { ok: true, simulated: true, email_sent: false };
  try {
    return await post("createReminder", row);
  } catch (e) {
    return { ok: false, simulated: false, error: "Network error." };
  }
}

export async function createLead(input) {
  const row = {
    email: input.email,
    county_slug: input.county_slug || null,
    address: input.address || null,
    outcome: input.outcome || "",
    consent_source: input.consent_source || "results_save",
    requestedAt: new Date().toISOString()
  };
  remember("lead", row);
  if (!backendEnabled()) return { ok: true, simulated: true, email_sent: false };
  try {
    return await post("createLead", row);
  } catch (e) {
    return { ok: false, simulated: false, error: "Network error." };
  }
}

export async function markConverted(input) {
  if (!backendEnabled()) return { ok: true, simulated: true };
  try {
    return await post("markConverted", {
      email: input.email,
      county_slug: input.county_slug || null
    });
  } catch (e) {
    return { ok: false, error: "Network error." };
  }
}
