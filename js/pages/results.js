import "../boot.js";
import { notify } from "../adapters/notify.js";
import { getCounty } from "../counties.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { borderlineReviewLine, deadlineReminderPlan, withUnsubscribe } from "../deadlineReminders.js";
import { nextWindowCopy } from "../engine.js";
import { contactLine, esc, formatDay, money, uid } from "../format.js";
import { offerMessage, orderBadgeHtml, purchaseOffer, reminderButtonLabel, reminderOnly } from "../offer.js";
import { VALUE_VS_RATE, WE_DO, YOU_DO, customerOutcome } from "../outcome.js";
import { slugForCountyId } from "../place.js";
import { reminderMessage } from "../place-ui.js";
import { confirmationBody, createMonitorRemote, enrollMonitor, monitorOfferHtml } from "../monitor.js";
import { MONITOR, planPriceLines } from "../pricing.js";
import { createLead, createReminder } from "../reminders.js";
import { currentMatter, saveMatter } from "../store.js";

function priceLine(county, offer) {
  const lines = planPriceLines(county);
  if (offer && offer.dfy) return `<p>Our fee: <b>${esc(lines.dfy)}</b></p>`;
  return "";
}

const root = document.querySelector("#results");
const matter = currentMatter();
if (!matter || !matter.outcome) {
  location.href = "index.html";
} else {
  const county = await getCounty(matter.countyId);
  render(matter, county);
}

function remindForm(matter, privacy, label) {
  return `
    <form id="remind-form" class="wide">
      <label>Email<input name="email" type="email" required value="${esc(matter.email || "")}" placeholder="you@example.com"></label>
      ${privacy}
      <label class="check"><input type="checkbox" name="deadlineReminders"> Email me reminders</label>
      <button class="btn" type="submit" ${matter.remindWhenOpen ? "disabled" : ""}>${esc(label)}</button>
      <p id="remind-ok" class="small muted" ${matter.remindWhenOpen ? "" : "hidden"}>${matter.remindWhenOpen ? "Saved for " + esc(matter.email) + "." : ""}</p>
    </form>`;
}

function emailForm(matter, privacy, label) {
  return `
    <form id="result-email" class="wide">
      <label>Email<input name="email" type="email" required value="${esc(matter.email || "")}" placeholder="you@example.com"></label>
      ${privacy}
      <label class="check"><input type="checkbox" name="deadlineReminders"> Email me reminders</label>
      <button class="btn ghost" type="submit">${esc(label)}</button>
      <p id="email-ok" class="small muted" hidden></p>
    </form>`;
}

function rangeHtml(savings) {
  if (!savings || savings.low == null) {
    return `<p>${esc((savings && savings.note) || "No dollar estimate on this check.")}</p>`;
  }
  if (savings.note === "No savings expected." || (savings.low === 0 && savings.mid === 0 && savings.high === 0)) {
    return `<p>No savings expected.</p>`;
  }
  return `
    <p><span class="chip chip-estimate">Estimate</span></p>
    <p>Estimated first-year savings: <b class="evidence">${esc(money(savings.low))}</b> – <b class="evidence">${esc(money(savings.high))}</b> (most likely ${esc(money(savings.mid))}).</p>
    <div class="range" role="img" aria-label="Low, likely, and high savings estimates">
      <div class="range-track"><i class="range-fill"></i><i class="range-mark" style="left:75%"></i></div>
      <div class="range-labels"><span>Low ${esc(money(savings.low))}</span><span>Likely ${esc(money(savings.mid))}</span><span>High ${esc(money(savings.high))}</span></div>
    </div>
    <p class="small muted">${esc(savings.bandNote || "")}</p>
    <p class="small muted">${esc(savings.note || "")}</p>`;
}

function scopeHtml() {
  return `<div class="scope">
    <div><h3>We do</h3><ul>${WE_DO.map(line => `<li>${esc(line)}</li>`).join("")}</ul></div>
    <div><h3>You do</h3><ul>${YOU_DO.map(line => `<li>${esc(line)}</li>`).join("")}</ul></div>
  </div>`;
}

function valueRateHtml() {
  return `<h2>A higher bill isn't always an appeal</h2>
    <p>Tax rates and voter-approved charges can raise your bill without changing your assessed value. We separate the two and only file on value.</p>
    <ul class="defs">${VALUE_VS_RATE.map(([name, text]) => `<li><b>${esc(name)}.</b> ${esc(text)}</li>`).join("")}</ul>
    <p><a href="understand/">Explain my notice</a></p>`;
}

function evidenceHtml(matter) {
  const rows = [
    ["Assessed value you entered", money(matter.assessed)],
    ["Your market-value estimate", matter.marketSkipped || matter.market == null ? "Skipped" : money(matter.market)],
    ["Gap", matter.reduction == null ? "Not calculated" : money(matter.reduction)],
    ["Tax bill you entered", matter.tax == null ? "Not entered" : money(matter.tax)]
  ];
  return `<h2>Your numbers</h2>
    <p><span class="chip chip-estimate">Estimate</span> <span class="chip chip-record">From what you typed</span></p>
    <table>${rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`).join("")}</table>`;
}

function render(matter, county) {
  const face = customerOutcome(matter.outcome);
  const savings = matter.savings || {};
  const showFact = (text) => text && !/unverified template/i.test(text);
  const rules = (county.rules || []).filter(showFact).map(rule => `<li>${esc(rule)}</li>`).join("");
  const timelines = (county.timelines || []).filter(row => showFact(row.text)).map(row => `<li>${esc(row.text)}</li>`).join("");
  const win = (county.filing && county.filing.regular_window) || {};
  const source = win.source_url ? `<a href="${esc(win.source_url)}">${esc(win.source_url)}</a>` : "not set on this adapter";
  const verified = win.verified_date ? formatDay(win.verified_date) : "not set on this adapter";
  const offer = purchaseOffer(county, new Date(), matter.supplementalNoticeDate);
  const privacy = `<p class="privacy-note">We use your email and approximate location only to run your check and send what you ask for. <a href="privacy.html">Privacy policy</a>.</p>`;
  const canBuy = offer.diy || offer.dfy;
  const gapLine = matter.marketSkipped || matter.reduction == null
    ? "Market value was skipped, so no reduction was calculated."
    : `Your assessed value is ${money(matter.reduction)} above the market estimate you gave us.`;

  let decision = "";
  let dockHtml = "";
  if (reminderOnly(offer) && matter.outcome !== "no_go") {
    const copy = offer.closed || matter.outcome === "off_season"
      ? nextWindowCopy(county, new Date())
      : (offerMessage(county, offer) || "Purchase is not available for this county.");
    const informal = (offer.closed || matter.outcome === "off_season") && county.informal_review
      ? `<h3>Free informal review</h3><p>${esc(county.informal_review)}</p>`
      : "";
    decision = `
      <h1>Filing is closed for this season in ${esc(county.county)}.</h1>
      <p>${esc(copy)}</p>
      ${informal}
      <p class="small muted"><span class="chip chip-record">From your county record</span> Deadline source: ${source}. Verified: ${esc(verified)}.</p>
      ${remindForm(matter, privacy, matter.outcome === "off_season" || offer.closed ? "Email me when it opens" : reminderButtonLabel(offer))}`;
  } else if (matter.outcome === "go" && canBuy) {
    decision = `
      <h1>You likely have a case.</h1>
      <p>${esc(gapLine)} Our fee: <b>${esc(planPriceLines(county).dfy)}</b></p>
      <div class="mobile-cta"><a class="btn" href="login.html?next=checkout.html">Have Sherwood file it, $249</a></div>
      ${rangeHtml(savings)}
      <p>Your card is saved, not charged, until the county confirms filing.</p>
      <p class="small muted">Low-risk step: email yourself this result and read it on a computer before you hire us.</p>
      ${emailForm(matter, privacy, "Email me this result to review on a computer")}
      <p><a href="how-it-works.html">What happens next</a></p>`;
    dockHtml = `<div class="check-dock" data-result-dock><a class="btn" href="login.html?next=checkout.html">Have Sherwood file it, $249</a></div>`;
  } else if (matter.outcome === "borderline") {
    decision = `
      <h1>It's close. A person will review it.</h1>
      <p>The low estimate is under our $249 fee, so we won't recommend filing until someone checks your numbers. ${esc(borderlineReviewLine(new Date()))}</p>
      ${rangeHtml(savings)}
      <p>${esc(offerMessage(county, offer) || "")}</p>
      ${emailForm(matter, privacy, "Send it for review (free)")}
      <p class="small muted">Filing stays off until a person marks this reviewed. There is no checkout on this result.</p>`;
  } else if (matter.outcome === "no_go") {
    decision = `
      <h1>No action recommended.</h1>
      <p>Based on your numbers, an appeal likely wouldn't save more than it costs. That's a real answer, not a sales step.</p>
      <ul>${(matter.reasons || []).map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>
      ${rangeHtml(savings)}
      <p>We are not offering a filing on this result.</p>
      ${remindForm(matter, privacy, "Remind me next year")}
      <p><a href="understand/">Explain my notice</a></p>
      <div class="card">
        <h3>Annual monitor</h3>
        <p>${esc(money(MONITOR.price))} a year per property. ${esc(MONITOR.summary)} The first year is not included unless you file.</p>
        ${monitorOfferHtml({ email: matter.email, enrolled: !!matter.monitor, cancelToken: matter.monitor && matter.monitor.cancelToken })}
      </div>`;
  } else if (offer.closed || matter.outcome === "off_season") {
    decision = `
      <h1>Filing is closed for this season in ${esc(county.county)}.</h1>
      <p>${esc(nextWindowCopy(county, new Date()))} We'll email you before it opens.</p>
      ${county.informal_review ? `<h3>Free informal review</h3><p>${esc(county.informal_review)}</p>` : ""}
      <p class="small muted"><span class="chip chip-record">From your county record</span> Deadline source: ${source}. Verified: ${esc(verified)}.</p>
      ${remindForm(matter, privacy, "Email me when it opens")}
      <div class="card">
        <h3>Annual monitor, $49/yr</h3>
        <p>${esc(MONITOR.summary)}</p>
        ${monitorOfferHtml({ email: matter.email, enrolled: !!matter.monitor, cancelToken: matter.monitor && matter.monitor.cancelToken })}
      </div>
      <p class="small muted">Assessor contact from the adapter: ${esc(contactLine(county.assessor_office))}</p>`;
  } else {
    decision = `
      <h1>Reminder only</h1>
      <p>${esc(offerMessage(county, offer) || "Purchase is not available for this county.")}</p>
      <p class="small muted">Deadline source: ${source}. Verified: ${esc(verified)}.</p>
      ${remindForm(matter, privacy, reminderButtonLabel(offer))}`;
  }

  const deadline = matter.window && matter.window.state === "open" ? orderBadgeHtml(county) : "";
  root.innerHTML = `
    <p class="outcome-mark" data-outcome="${esc(face.id)}">${esc(face.label)}</p>
    ${deadline}
    <div class="split result-layout">
      <div class="result-evidence">
        <p class="lead">For ${esc(matter.address)}. ${esc(county.county)} (${esc(county.status_label)}).</p>
        ${evidenceHtml(matter)}
        ${priceLine(county, offer)}
        <p class="small muted">${matter.outcome === "off_season" ? esc(nextWindowCopy(county, new Date())) : `Window: ${esc(matter.window && matter.window.label || "not set")}. Adapter deadline: ${esc(formatDay(county.filing.current_year_deadline))}.`}</p>
        <p class="small muted"><span class="chip chip-record">From your county record</span> Deadline source: ${source}. Verified: ${esc(verified)}.</p>
        ${valueRateHtml()}
        ${scopeHtml()}
        <h2>What this county adapter says</h2>
        <ul>${rules}</ul>
        <ul>${timelines}</ul>
        <p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>
        <div class="card" aria-label="Comparable sales locked">
          <p class="muted small" style="margin-top:0">Comparable sales <span class="chip chip-sample">Sample</span></p>
          <p class="blur" aria-hidden="true">0000 Sample St · $0,000,000</p>
          <p class="small muted" style="margin-bottom:0">Locked because this demo does not have comparable sales for your address. We do not invent them. The pilot method is on the case study page, and those sales belong to that pilot, not to this check.</p>
        </div>
      </div>
      <div class="result-decision">
        ${decision}
      </div>
    </div>
    ${dockHtml}`;

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
        consent_source: matter.outcome === "no_go" ? "results_no_action" : "results_off_season"
      });
      matter.remindWhenOpen = { at: new Date().toISOString(), email, openDate: null, simulated: !!result.simulated };
      await queueDeadlineReminders(matter, county, new FormData(remind).get("deadlineReminders") === "on");
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
      if (matter.outcome === "borderline") matter.reviewRequested = true;
      await queueDeadlineReminders(matter, county, new FormData(saveForm).get("deadlineReminders") === "on");
      saveMatter(matter);
      const result = await createLead({
        email,
        county_slug: slugForCountyId(matter.countyId),
        address: matter.address,
        outcome: matter.outcome,
        consent_source: matter.outcome === "borderline" ? "results_review" : "results_save"
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
  const resultDock = document.querySelector("[data-result-dock]");
  const primary = document.querySelector(".mobile-cta");
  if (resultDock && primary && "IntersectionObserver" in window) {
    const narrow = window.matchMedia("(max-width: 800px)");
    const io = new IntersectionObserver(([entry]) => {
      resultDock.hidden = !narrow.matches || !entry || entry.isIntersecting;
    });
    io.observe(primary);
    narrow.addEventListener("change", () => { resultDock.hidden = !narrow.matches; });
  }
}

async function queueDeadlineReminders(matter, county, optIn) {
  if (optIn !== true || matter.deadlineReminders) return;
  matter.reminderOptIn = true;
  matter.reminderUnsubscribeToken = matter.reminderUnsubscribeToken || uid("unsub");
  const rows = withUnsubscribe(deadlineReminderPlan(county), matter.reminderUnsubscribeToken).map(row => ({
    ...row,
    status: "scheduled",
    simulated: true
  }));
  matter.deadlineReminders = rows;
  matter.caseEmails = Array.isArray(matter.caseEmails) ? matter.caseEmails : [];
  const to = matter.email ? [matter.email] : [];
  for (const row of rows) {
    for (const email of to) {
      await notify.outbox({
        channel: "email",
        to: email,
        kind: row.kind,
        subject: row.subject,
        scheduledFor: row.sendOn,
        simulated: true,
        body: `${row.subject}\n\n${row.body}`
      });
    }
    matter.caseEmails.push({ ...row, to, at: row.sendOn, simulated: true });
  }
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
    const setup = await paymentsAdapter.saveCard({
      userId: matter.userId || null,
      matterId: matter.id,
      plan: { id: "monitor" }
    });
    const record = enrollMonitor({
      email,
      matterId: matter.id,
      userId: matter.userId || null,
      setupIntentId: setup.id
    });
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
