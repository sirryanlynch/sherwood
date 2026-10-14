import "../boot.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { chargeReady, chargeSavedCardIfReady, recordCountyConfirmation } from "../chargeGate.js";
import { planById } from "../pricing.js";
import { loadCounties } from "../counties.js";
import { formatDay, esc, parseISODate } from "../format.js";
import { AUTHORIZATION_RETENTION, retainUntil } from "../retention.js";
import { loadDb, saveDb } from "../store.js";

const STAGES = ["filed", "acknowledged", "assessor_review", "hearing_scheduled", "decision", "refund", "monitor", "kit_ready"];
const root = document.querySelector("#admin");
const counties = await loadCounties();
paint();

function paint() {
  const db = loadDb();
  const groups = STAGES.map(stage => {
    const rows = db.matters.filter(m => m.stage === stage);
    return `<h3>${esc(stage)}</h3>` + (rows.length ? table(rows) : `<p class="small muted">None in this browser.</p>`);
  }).join("");
  const unstaged = db.matters.filter(m => !m.stage);
  const queue = db.matters.filter(m => m.outcome === "borderline" && !m.reviewed);
  const today = new Date();
  const calendar = counties.map(county => {
    const win = county.filing.regular_window || {};
    const end = parseISODate(win.end);
    let distance = "no end date";
    if (end) {
      const ms = end - new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const days = Math.round(ms / 86400000);
      distance = days >= 0 ? `${days} days until the template or verified end date` : `${Math.abs(days)} days after that end date`;
    }
    const source = win.source_url ? `<a href="${esc(win.source_url)}">${esc(win.source_url)}</a>` : "source not set";
    const verified = win.verified_date ? formatDay(win.verified_date) : "verified date not set";
    return `<li><b>${esc(county.county)}</b> — ${esc(county.status_label)}. ${esc(win.label || "no window")}. ${esc(distance)}. Deadline field: ${esc(formatDay(county.filing.current_year_deadline))}. ${source}. Verified ${esc(verified)}.</li>`;
  }).join("");
  root.innerHTML = `
    <h1>Ops</h1>
    <p class="lead">This view reads appeals saved in this browser. It is not a secure admin and it is not on a server.</p>
    <h2>Mark filed, then charge</h2>
    <p class="small muted">We file it saves a card. The charge runs only when this appeal already has a filing time, a filing ID, and a county confirmation, and the filing is not simulated. Recording the confirmation is a separate step and does not charge the card.</p>
    ${chargeQueue(db.matters)}
    <h2>Signed agent authorizations</h2>
    <p>${esc(AUTHORIZATION_RETENTION)}</p>
    ${authorizationRows(db.matters)}
    <h2>Paid cases by src</h2>
    ${paidBySrc(db.matters)}
    <h2>Review queue</h2>
    ${queue.length ? queue.map(m => `<div class="card"><p><b>${esc(m.address)}</b> · ${esc(m.outcome)} · ${esc(m.countyId)}</p><ul>${(m.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul><button class="btn" type="button" data-review="${esc(m.id)}">Mark reviewed</button></div>`).join("") : `<p>No borderline checks waiting.</p>`}
    <h2>Pipeline</h2>
    ${groups}
    <h3>Not filed</h3>
    ${unstaged.length ? table(unstaged) : `<p class="small muted">None.</p>`}
    <h2>Deadlines by county adapter</h2>
    <ul>${calendar}</ul>`;
  root.querySelectorAll("[data-charge]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-charge");
      const fail = button.getAttribute("data-fail") === "1";
      const current = loadDb().matters.find(m => m.id === id);
      const charge = await chargeSavedCardIfReady(current, () => paymentsAdapter.chargeSavedCard({
        userId: current.userId,
        matterId: current.id,
        setupIntentId: current.setupIntentId,
        amount: (planById(current.planId) && planById(current.planId).price) || 249,
        fail,
        attribution: current.attribution
      }));
      if (!charge) return;
      const next = loadDb();
      const matter = next.matters.find(m => m.id === id);
      if (!matter) return;
      matter.chargeStatus = charge.status;
      matter.charge = {
        id: charge.id,
        status: charge.status,
        reason: charge.reason || "",
        at: charge.createdAt,
        amount: charge.amount
      };
      if (charge.status === "succeeded") {
        matter.paymentId = charge.id;
        matter.paidAt = charge.createdAt;
      }
      saveDb(next);
      paint();
    });
  });
  root.querySelectorAll("[data-confirm]").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const id = form.getAttribute("data-confirm");
      const next = loadDb();
      const matter = next.matters.find(m => m.id === id);
      const data = new FormData(form);
      const result = recordCountyConfirmation(matter, {
        confirmedOn: data.get("confirmedOn"),
        countyReference: data.get("countyReference")
      });
      if (!result.ok) return;
      saveDb(next);
      paint();
    });
  });
  root.querySelectorAll("[data-review]").forEach(button => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-review");
      const next = loadDb();
      const matter = next.matters.find(m => m.id === id);
      if (matter) matter.reviewed = true;
      saveDb(next);
      paint();
    });
  });
}

function sourceLabel(matter) {
  const touch = matter && matter.attribution;
  if (!touch) return "";
  const src = touch.src || "";
  const utm = touch.utm && typeof touch.utm === "object"
    ? Object.entries(touch.utm).map(([key, value]) => `${key}=${value}`).join(", ")
    : "";
  if (src && utm) return `${src} (${utm})`;
  return src || utm;
}

function chargeQueue(matters) {
  const rows = matters.filter(matter => matter.planId === "dfy" && matter.setupIntentId);
  if (!rows.length) return `<p class="small muted">No saved cards in this browser.</p>`;
  return rows.map(matter => {
    const done = matter.chargeStatus === "succeeded";
    const status = matter.chargeStatus || "not_charged";
    const detail = matter.charge && matter.charge.reason ? ` ${matter.charge.reason}` : "";
    const ready = chargeReady(matter);
    const buttons = ready
      ? `<button class="btn" type="button" data-charge="${esc(matter.id)}" ${done ? "disabled" : ""}>Mark filed, then charge</button>
      <button class="btn ghost" type="button" data-charge="${esc(matter.id)}" data-fail="1" ${done ? "disabled" : ""}>Record a failed charge</button>`
      : `<p class="small muted">The charge stays off until this appeal has a filing time, a filing ID, and a county confirmation, and the filing is not simulated.</p>`;
    return `<div class="card"><p><b>${esc(matter.address)}</b></p><p>Charge: ${esc(status)}.${esc(detail)}</p>
      ${confirmationForm(matter)}
      ${buttons}</div>`;
  }).join("");
}

function confirmationForm(matter) {
  const filing = matter.filing;
  if (!filing) return `<p class="small muted">Record a filing before a county confirmation.</p>`;
  const when = /^\d{4}-\d{2}-\d{2}/.test(String(filing.countyConfirmedAt || "")) ? String(filing.countyConfirmedAt).slice(0, 10) : "";
  const recorded = filing.countyConfirmedAt
    ? `<p>Recorded county confirmation: ${esc(filing.countyConfirmedAt)}. Reference: ${esc(filing.countyReference || "")}.</p>`
    : "";
  return `${recorded}
    <form data-confirm="${esc(matter.id)}">
      <label>Confirmation date<input name="confirmedOn" type="date" required value="${esc(when)}"></label>
      <label>County reference<input name="countyReference" required value="${esc(filing.countyReference || "")}"></label>
      <button class="btn" type="submit">Record county confirmation</button>
    </form>`;
}

function authorizationRows(matters) {
  const rows = matters.filter(matter => matter.agentAuthorization && matter.agentAuthorization.signedAt);
  if (!rows.length) return `<p class="small muted">No signed agent authorizations in this browser.</p>`;
  return `<ul>${rows.map(matter => {
    const auth = matter.agentAuthorization;
    const until = auth.retainUntil || retainUntil(auth.signedAt);
    return `<li>${esc(matter.address)} — signed ${esc(auth.signedAt)}. Kept until ${esc(until)}.</li>`;
  }).join("")}</ul>`;
}

function paidBySrc(matters) {
  const counts = new Map();
  matters.forEach(matter => {
    if (!matter.paymentId && !matter.paidAt) return;
    const src = matter.attribution && matter.attribution.src ? matter.attribution.src : "(none)";
    counts.set(src, (counts.get(src) || 0) + 1);
  });
  if (!counts.size) return `<p class="small muted">No paid cases in this browser.</p>`;
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return `<ul>${rows.map(([src, count]) => `<li><b>${esc(src)}</b> — ${count}</li>`).join("")}</ul>`;
}

function table(rows) {
  return `<div class="table-scroll"><table><tr><th>Address</th><th>Outcome</th><th>Plan</th><th>County</th><th>Src</th></tr>${rows.map(m => `<tr><td>${esc(m.address)}</td><td>${esc(m.outcome || "")}</td><td>${esc(m.planId || "")}</td><td>${esc(m.countyId || "")}</td><td>${esc(sourceLabel(m))}</td></tr>`).join("")}</table></div>`;
}
