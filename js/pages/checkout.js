import "../boot.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { readAttribution } from "../attribution.js";
import { money, esc, formatDay } from "../format.js";
import { CHECKOUT_PLANS, planPriceLines } from "../pricing.js";
import { getCounty } from "../counties.js";
import { deadlineBadge, filingWindow, nextWindowCopy } from "../engine.js";
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
    const deadline = deadlineBadge(county);
    root.innerHTML = `
      <h1>Choose a plan</h1>
      ${deadline ? `<p class="badge">${esc(deadline)}</p>` : ""}
      <p class="lead">${esc(matter.address)}</p>
      <form id="pay" class="wide">
        <div class="plans">
          ${CHECKOUT_PLANS.map(plan => cardHtml(plan, lines, savings)).join("")}
        </div>
        <p class="small muted">Simulated Stripe. We file it saves the card and does not charge it. There is no card field.</p>
        <button class="btn" type="submit">Continue</button>
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
      matter.attribution = matter.attribution || readAttribution();
      matter.userId = user.id;
      matter.planId = plan.id;
      if (plan.id === "dfy") {
        const setup = await paymentsAdapter.saveCard({
          userId: user.id,
          matterId: matter.id,
          plan,
          attribution: matter.attribution
        });
        matter.setupIntentId = setup.id;
        matter.cardSavedAt = setup.createdAt;
        matter.chargeStatus = "not_charged";
        matter.paymentId = null;
        matter.paidAt = null;
        matter.src = setup.src;
      } else {
        matter.paymentTimingNote = plan.timingFlag || "";
        matter.chargeStatus = "timing_pending";
        matter.setupIntentId = null;
        matter.paymentId = null;
        matter.paidAt = null;
        matter.src = (matter.attribution && matter.attribution.src) || null;
      }
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
  const source = win.source_url ? `<a href="${esc(win.source_url)}">${esc(win.source_url)}</a>` : "not set on this adapter";
  const verified = win.verified_date ? formatDay(win.verified_date) : "not set on this adapter";
  const title = window.state === "off_season" ? "The filing window is closed" : "Checkout cannot continue";
  return `
    <h1>${esc(title)}</h1>
    <p class="lead">Checkout cannot proceed. This county's filing window is not open on the adapter.</p>
    <div class="card">
      <p>${esc(nextWindowCopy(county, new Date()))}</p>
      <ul>${(window.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
      <p>Deadline source: ${source}</p>
      <p>Verified: ${esc(verified)}</p>
    </div>
    <div class="cta"><a class="btn" href="results.html">Back to your result</a></div>`;
}

function cardHtml(plan, lines, savings) {
  const price = plan.id === "dfy" ? lines.dfy : lines.diyLine;
  const waiver = plan.id === "diy" && lines.feeNote ? `<p class="small muted">${esc(lines.feeNote)}</p>` : "";
  const estimate = savings == null
    ? "No dollar estimate on this check."
    : `${ESTIMATE_LABEL} ${money(savings)}.`;
  const flag = plan.timingFlag ? `<p><b>${esc(plan.timingFlag)}</b></p>` : "";
  return `
    <label class="card">
      <input type="radio" name="plan" value="${plan.id}" required>
      <h3>${esc(plan.name)}</h3>
      <p><b>${esc(price)}</b></p>
      ${flag}
      ${waiver}
      <p>${esc(estimate)}</p>
      ${plan.chargeNote ? `<p>${esc(plan.chargeNote)}</p>` : ""}
      <p class="small muted">${esc(plan.summary)}</p>
    </label>`;
}
