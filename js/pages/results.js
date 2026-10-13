import "../boot.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { notify } from "../adapters/notify.js";
import { getCounty } from "../counties.js";
import { contactLine, esc, formatDay, money } from "../format.js";
import { MONITOR } from "../pricing.js";
import { currentMatter, saveMatter } from "../store.js";

const root = document.querySelector("#results");
const matter = currentMatter();
if (!matter || !matter.outcome) {
  location.href = "index.html";
} else {
  const county = await getCounty(matter.countyId);
  render(matter, county);
}

function render(matter, county) {
  const labels = {
    go: "Go",
    borderline: "Borderline — human review",
    no_go: "No-go",
    off_season: "Filing opens later"
  };
  const savings = matter.savings || {};
  const rules = (county.rules || []).map(rule => `<li>${esc(rule)}</li>`).join("");
  const timelines = (county.timelines || []).map(row => `<li>${esc(row.text)}</li>`).join("");
  const win = (county.filing && county.filing.regular_window) || {};
  const source = win.source_url ? `<a href="${esc(win.source_url)}">${esc(win.source_url)}</a>` : "not set on this adapter";
  const verified = win.verified_date ? formatDay(win.verified_date) : "not set on this adapter";
  let savingsHtml = "";
  if (matter.marketSkipped || matter.reduction == null) {
    savingsHtml = `<p>Market value was skipped, so no reduction was calculated. ${esc(savings.note || "")}</p>`;
  } else {
    savingsHtml = `<p>Assessed value minus your market-value estimate: <b>${esc(money(matter.reduction))}</b>. Estimate, not a result.</p>`;
    if (savings.amount == null) savingsHtml += `<p>${esc(savings.note || "")}</p>`;
    else savingsHtml += `<p>Estimated first-year tax difference: <b>${esc(money(savings.amount))}</b>. Rate used: ${(savings.rate * 100).toFixed(2)}% from your tax bill ÷ assessed value. ${esc(savings.note)}</p>`;
  }

  let next = "";
  if (matter.outcome === "go") {
    next = `<div class="cta"><a class="btn" href="login.html?next=checkout.html">Create an account and choose a plan</a></div>`;
  } else if (matter.outcome === "borderline") {
    next = `<p>You can create an account. Sherwood will not treat this as ready to file until a person marks it reviewed. The ops queue on this browser lists it.</p>
      <div class="cta"><a class="btn" href="login.html?next=checkout.html">Create an account</a></div>`;
  } else if (matter.outcome === "no_go") {
    next = `<p>There is no checkout on a no-go. Your email is already stored with this check.</p>
      <div class="cta"><a class="btn ghost" href="how-it-works.html">See how a case moves when the numbers support it</a></div>`;
  } else {
    const opens = win.start ? formatDay(win.start) : "This adapter does not state an opening date.";
    next = `
      <div class="card">
        <h2>Filing opens later</h2>
        <p>The window on this adapter opens: <b>${esc(opens)}</b>.</p>
        <p class="small muted">Deadline source: ${source}. Verified: ${esc(verified)}.</p>
        <div class="cta"><button class="btn" id="remind" type="button" ${matter.remindWhenOpen ? "disabled" : ""}>Remind me when filing opens</button></div>
        <p id="remind-ok" class="small muted" ${matter.remindWhenOpen ? "" : "hidden"}>Saved in this browser for ${esc(matter.email)}. No email was sent.</p>
      </div>
      <div class="card">
        <h3>Annual monitor</h3>
        <p>${esc(money(MONITOR.price))} a year. ${esc(MONITOR.summary)}</p>
        <button class="btn" id="monitor" type="button" ${matter.monitor ? "disabled" : ""}>${matter.monitor ? "Monitor recorded in this browser" : "Add the annual monitor"}</button>
        <p id="monitor-ok" class="small muted" ${matter.monitor ? "" : "hidden"}>A ${esc(money(MONITOR.price))} monitor record is stored in this browser. Nothing was billed to a card.</p>
      </div>
      <p class="small muted">${esc(county.informal_review || "")}</p>
      <p class="small muted">Assessor contact from the adapter: ${esc(contactLine(county.assessor_office))}</p>`;
  }

  root.innerHTML = `
    <p class="badge">${esc(labels[matter.outcome] || matter.outcome)}</p>
    <h1>Your check</h1>
    <p class="lead">For ${esc(matter.address)}. County adapter: ${esc(county.county)} (${esc(county.status_label)}).</p>
    <div class="card">
      ${savingsHtml}
      <p class="small muted">Window: ${esc(matter.window && matter.window.label || "not set")}. Adapter deadline: ${esc(formatDay(county.filing.current_year_deadline))}.</p>
      <p class="small muted">Deadline source: ${source}. Verified: ${esc(verified)}.</p>
      <p>County fee on this adapter: ${esc((county.filing.efile && county.filing.efile_fee && county.filing.efile_fee.label) || (county.filing.paper_fee && county.filing.paper_fee.label) || "No fee is set. Do not quote one.")}</p>
      <ul>${(matter.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    </div>
    ${next}
    <h2>What this county adapter says</h2>
    <ul>${rules}</ul>
    <ul>${timelines}</ul>
    <p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>
    <div class="card" aria-label="Comparable sales locked">
      <p class="muted small" style="margin-top:0">Comparable sales</p>
      <p class="blur" aria-hidden="true">0000 Sample St · $0,000,000</p>
      <p class="small muted" style="margin-bottom:0">Locked because this demo does not have comparable sales for your address. We do not invent them. The pilot method is on the case study page, and those sales belong to that pilot, not to this check.</p>
    </div>`;

  const remind = document.querySelector("#remind");
  if (remind) {
    remind.addEventListener("click", async () => {
      const opens = win.start || null;
      matter.remindWhenOpen = {
        at: new Date().toISOString(),
        email: matter.email,
        openDate: opens
      };
      saveMatter(matter);
      await notify.outbox({
        channel: "email",
        to: matter.email,
        kind: "remind_when_open",
        simulated: true,
        body: `Reminder request stored for ${matter.email}. Not sent. Opening date on the adapter: ${opens ? formatDay(opens) : "not set"}.`
      });
      remind.disabled = true;
      const ok = document.querySelector("#remind-ok");
      if (ok) ok.hidden = false;
    });
  }
  const monitor = document.querySelector("#monitor");
  if (monitor) {
    monitor.addEventListener("click", async () => {
      const payment = await paymentsAdapter.charge({
        userId: matter.userId || null,
        matterId: matter.id,
        plan: MONITOR,
        amount: MONITOR.price
      });
      matter.monitor = { paymentId: payment.id, at: payment.createdAt, price: MONITOR.price, simulated: true };
      saveMatter(matter);
      await notify.outbox({
        channel: "email",
        to: matter.email,
        kind: "monitor",
        simulated: true,
        body: `Annual monitor at ${money(MONITOR.price)} a year recorded in this browser. Not billed.`
      });
      monitor.disabled = true;
      monitor.textContent = "Monitor recorded in this browser";
      const ok = document.querySelector("#monitor-ok");
      if (ok) ok.hidden = false;
    });
  }
}
