import "../boot.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { money, esc, formatDay } from "../format.js";
import { CHECKOUT_PLANS, planPriceLines } from "../pricing.js";
import { getCounty } from "../counties.js";
import { filingWindow } from "../engine.js";
import { slugForCountyId } from "../place.js";
import { markConverted } from "../reminders.js";
import { requireMatter, saveMatter } from "../store.js";

const ESTIMATE_LABEL = "Estimate from your numbers, if the county agrees to your value.";

const gate = requireMatter("checkout.html");
if (gate) {
  const { matter, user } = gate;
  const county = await getCounty(matter.countyId);
  const season = filingWindow(county, new Date(), matter.supplementalNoticeDate);
  const root = document.querySelector("#checkout");
  if (season.state !== "open") {
    root.innerHTML = closedHtml(county, season);
  } else if (matter.outcome === "no_go") {
    location.href = "results.html";
  } else {
    const savings = matter.savings && matter.savings.amount;
    const lines = planPriceLines(county);
    root.innerHTML = `
      <h1>Choose a plan</h1>
      <p class="lead">${esc(matter.address)}</p>
      <form id="pay" class="wide">
        <div class="plans">
          ${CHECKOUT_PLANS.map(plan => cardHtml(plan, lines, savings)).join("")}
        </div>
        <p class="small muted">Simulated Stripe. There is no card field. Pressing the button writes a local payment record only.</p>
        <button class="btn" type="submit">Simulate payment and continue</button>
      </form>`;
    document.querySelector("#pay").addEventListener("submit", async e => {
      e.preventDefault();
      if (!e.target.reportValidity()) return;
      const plan = CHECKOUT_PLANS.find(p => p.id === new FormData(e.target).get("plan"));
      if (!plan) return;
      const live = filingWindow(county, new Date(), matter.supplementalNoticeDate);
      if (live.state !== "open") {
        root.innerHTML = closedHtml(county, live);
        return;
      }
      const payment = await paymentsAdapter.charge({
        userId: user.id,
        matterId: matter.id,
        plan,
        amount: plan.dueToday
      });
      matter.userId = user.id;
      matter.planId = plan.id;
      matter.paymentId = payment.id;
      matter.paidAt = payment.createdAt;
      saveMatter(matter);
      if (matter.email) {
        try { await markConverted({ email: matter.email, county_slug: slugForCountyId(matter.countyId) }); }
        catch (err) { /* conversion is a reminder flag; checkout still continues */ }
      }
      location.href = "intake.html";
    });
  }
}

function closedHtml(county, window) {
  const win = (county.filing && county.filing.regular_window) || {};
  const opens = win.start ? formatDay(win.start) : "This adapter does not state an opening date.";
  const source = win.source_url ? `<a href="${esc(win.source_url)}">${esc(win.source_url)}</a>` : "not set on this adapter";
  const verified = win.verified_date ? formatDay(win.verified_date) : "not set on this adapter";
  const title = window.state === "off_season" ? "The filing window is closed" : "Checkout cannot continue";
  return `
    <h1>${esc(title)}</h1>
    <p class="lead">Checkout cannot proceed. This county's filing window is not open on the adapter.</p>
    <div class="card">
      <p>${esc(window.label || "No window label on this adapter.")}</p>
      <ul>${(window.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
      <p>Opens: ${esc(opens)}</p>
      <p>Deadline source: ${source}</p>
      <p>Verified: ${esc(verified)}</p>
    </div>
    <div class="cta"><a class="btn" href="results.html">Back to your result</a></div>`;
}

function cardHtml(plan, lines, savings) {
  const price = plan.id === "dfy" ? lines.dfy : lines.diy;
  const fee = plan.id === "diy" && lines.diyFee ? `<p>${esc(lines.diyFee)}</p>` : "";
  const versus = savings == null ? "no dollar estimate on this check" : money(savings);
  return `
    <label class="card">
      <input type="radio" name="plan" value="${plan.id}" required>
      <h3>${esc(plan.name)}</h3>
      <p><b>${esc(price)}</b></p>
      ${fee}
      <p>vs ${esc(versus)}</p>
      ${plan.chargeNote ? `<p>${esc(plan.chargeNote)}</p>` : ""}
      <p class="small muted">${esc(ESTIMATE_LABEL)}</p>
      <p class="small muted">${esc(plan.summary)}</p>
    </label>`;
}
