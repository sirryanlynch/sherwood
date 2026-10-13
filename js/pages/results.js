import "../boot.js";
import { notify } from "../adapters/notify.js";
import { getCounty } from "../counties.js";
import { deadlineBadge, nextWindowCopy } from "../engine.js";
import { contactLine, esc, formatDay, money } from "../format.js";
import { slugForCountyId } from "../place.js";
import { reminderMessage } from "../place-ui.js";
import { confirmationBody, createMonitorRemote, enrollMonitor, monitorOfferHtml } from "../monitor.js";
import { MONITOR, planPriceLines } from "../pricing.js";
import { createLead, createReminder } from "../reminders.js";
import { currentMatter, saveMatter } from "../store.js";

function priceLine(county) {
  const lines = planPriceLines(county);
  if (lines.fee == null) return "";
  return `<p>DIY kit ${esc(lines.diyLine)}. We file it ${esc(lines.dfy)}</p>`;
}

const root = document.querySelector("#results");
const matter = currentMatter();
if (!matter || !matter.outcome) {
  location.href = "index.html";
} else {
  const county = await getCounty(matter.countyId);
  render(matter, county);
}

function emailForm(matter, privacy) {
  return `
    <form id="result-email" class="wide">
      <label>Email this result<input name="email" type="email" required value="${esc(matter.email || "")}" placeholder="you@example.com"></label>
      ${privacy}
      <button class="btn" type="submit">Email me this result</button>
      <p id="email-ok" class="small muted" hidden></p>
    </form>`;
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

  const disclaimer = `<div class="disclaimer"><p><b>Before you continue to checkout.</b> Sherwood is not a law firm and does not provide legal advice. You sign the application's certification. With your written authorization, Sherwood can file as your agent where that county allows it. Results are estimates. The board may increase, decrease, or leave an assessment unchanged. Filing does not pause your tax bill.</p></div>`;
  const privacy = `<p class="privacy-note">We use your email and approximate location only to run your check and send what you ask for. <a href="privacy.html">Privacy policy</a>.</p>`;
  let next = "";
  if (matter.outcome === "go") {
    next = `${disclaimer}
      ${emailForm(matter, privacy)}
      <div class="cta"><a class="btn" href="login.html?next=checkout.html">Create an account and choose a plan</a></div>`;
  } else if (matter.outcome === "borderline") {
    next = `<p>You can create an account. Sherwood will not treat this as ready to file until a person marks it reviewed. The ops queue on this browser lists it.</p>
      ${disclaimer}
      ${emailForm(matter, privacy)}
      <div class="cta"><a class="btn" href="login.html?next=checkout.html">Create an account</a></div>`;
  } else if (matter.outcome === "no_go") {
    next = `<p>There is no checkout on a no-go.</p>
      ${emailForm(matter, privacy)}
      <div class="cta"><a class="btn ghost" href="how-it-works.html">See how a case moves when the numbers support it</a></div>`;
  } else {
    next = `
      <div class="card">
        <h2>Filing opens later</h2>
        <p>${esc(nextWindowCopy(county, new Date()))}</p>
        <p class="small muted">Deadline source: ${source}. Verified: ${esc(verified)}.</p>
        <form id="remind-form" class="wide">
          <label>Email<input name="email" type="email" required value="${esc(matter.email || "")}" placeholder="you@example.com"></label>
          ${privacy}
          <button class="btn" type="submit" ${matter.remindWhenOpen ? "disabled" : ""}>Remind me when filing opens</button>
          <p id="remind-ok" class="small muted" ${matter.remindWhenOpen ? "" : "hidden"}>${matter.remindWhenOpen ? "Saved for " + esc(matter.email) + "." : ""}</p>
        </form>
      </div>
      <div class="card">
        <h3>Annual monitor</h3>
        <p>${esc(money(MONITOR.price))} a year. ${esc(MONITOR.summary)}</p>
        ${monitorOfferHtml({ email: matter.email, enrolled: !!matter.monitor, cancelToken: matter.monitor && matter.monitor.cancelToken })}
      </div>
      <p class="small muted">${esc(county.informal_review || "")}</p>
      <p class="small muted">Assessor contact from the adapter: ${esc(contactLine(county.assessor_office))}</p>`;
  }

  const deadline = matter.window && matter.window.state === "open" ? deadlineBadge(county) : "";
  root.innerHTML = `
    <p class="badge">${esc(labels[matter.outcome] || matter.outcome)}</p>
    ${deadline ? `<p class="badge">${esc(deadline)}</p>` : ""}
    <h1>Your check</h1>
    <p class="lead">For ${esc(matter.address)}. County adapter: ${esc(county.county)} (${esc(county.status_label)}).</p>
    <div class="card">
      ${savingsHtml}
      <p class="small muted">${matter.outcome === "off_season" ? esc(nextWindowCopy(county, new Date())) : `Window: ${esc(matter.window && matter.window.label || "not set")}. Adapter deadline: ${esc(formatDay(county.filing.current_year_deadline))}.`}</p>
      <p class="small muted">Deadline source: ${source}. Verified: ${esc(verified)}.</p>
      ${priceLine(county)}
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

  const remind = document.querySelector("#remind-form");
  if (remind) {
    remind.addEventListener("submit", async e => {
      e.preventDefault();
      const email = String(new FormData(remind).get("email") || "").trim();
      if (!remind.reportValidity()) return;
      matter.email = email;
      const result = await createReminder({
        email,
        county_slug: slugForCountyId(matter.countyId),
        address: matter.address,
        marketing_consent: true,
        consent_source: "results_off_season"
      });
      matter.remindWhenOpen = { at: new Date().toISOString(), email, openDate: null, simulated: !!result.simulated };
      saveMatter(matter);
      await notify.outbox({
        channel: "email",
        to: email,
        kind: "remind_when_open",
        simulated: true,
        body: `Reminder request stored for ${email}. ${result.simulated ? "No email was sent." : reminderMessage(result)} ${nextWindowCopy(county, new Date())}`
      });
      remind.querySelector("button").disabled = true;
      const ok = document.querySelector("#remind-ok");
      if (ok) {
        ok.hidden = false;
        ok.textContent = reminderMessage(result);
      }
    });
  }
  const saveForm = document.querySelector("#result-email");
  if (saveForm) {
    saveForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!saveForm.reportValidity()) return;
      const email = String(new FormData(saveForm).get("email") || "").trim();
      matter.email = email;
      saveMatter(matter);
      const result = await createLead({
        email,
        county_slug: slugForCountyId(matter.countyId),
        address: matter.address,
        outcome: matter.outcome,
        consent_source: "results_save"
      });
      const ok = document.querySelector("#email-ok");
      if (ok) {
        ok.hidden = false;
        ok.textContent = result.simulated
          ? "Saved in this browser. No email was sent."
          : (result.email_sent ? "Check your email for this result." : (result.ok ? "Saved. Email is not configured yet." : (result.error || "Could not save.")));
      }
    });
  }
  bindMonitor(matter);
}

function bindMonitor(matter) {
  const form = document.querySelector("#monitor-form");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const data = new FormData(form);
    const err = form.querySelector("#monitor-consent-err");
    if (data.get("renewalConsent") !== "on") {
      if (err) err.hidden = false;
      return;
    }
    if (!form.reportValidity()) return;
    if (err) err.hidden = true;
    const email = String(data.get("email") || "").trim();
    const record = enrollMonitor({ email, matterId: matter.id, userId: matter.userId || null });
    matter.email = email;
    matter.monitor = {
      id: record.id,
      at: record.consentedAt,
      price: record.price,
      cancelToken: record.cancelToken,
      retainUntil: record.retainUntil,
      renewsOn: record.renewsOn
    };
    saveMatter(matter);
    await notify.outbox({
      channel: "email",
      to: email,
      kind: "monitor_confirm",
      simulated: true,
      body: confirmationBody(record)
    });
    await createMonitorRemote(record);
    form.outerHTML = monitorOfferHtml({ email, enrolled: true, cancelToken: record.cancelToken });
  });
}
