import "../boot.js";
import { loadCounties } from "../counties.js";
import { formatDay, esc, parseISODate } from "../format.js";
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
    <h2>Review queue</h2>
    ${queue.length ? queue.map(m => `<div class="card"><p><b>${esc(m.address)}</b> · ${esc(m.outcome)} · ${esc(m.countyId)}</p><ul>${(m.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul><button class="btn" type="button" data-review="${esc(m.id)}">Mark reviewed</button></div>`).join("") : `<p>No borderline checks waiting.</p>`}
    <h2>Pipeline</h2>
    ${groups}
    <h3>Not filed</h3>
    ${unstaged.length ? table(unstaged) : `<p class="small muted">None.</p>`}
    <h2>Deadlines by county adapter</h2>
    <ul>${calendar}</ul>`;
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

function table(rows) {
  return `<div class="table-scroll"><table><tr><th>Address</th><th>Outcome</th><th>Plan</th><th>County</th></tr>${rows.map(m => `<tr><td>${esc(m.address)}</td><td>${esc(m.outcome || "")}</td><td>${esc(m.planId || "")}</td><td>${esc(m.countyId || "")}</td></tr>`).join("")}</table></div>`;
}
