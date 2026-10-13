import "../boot.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { readAttribution } from "../attribution.js";
import { money, esc, formatDay } from "../format.js";
import { CHECKOUT_PLANS, adapterFeeNotes, planPriceLines } from "../pricing.js";
import { getCounty } from "../counties.js";
import { filingWindow, nextWindowCopy } from "../engine.js";
import { mountOrderCountdowns, offerMessage, orderBadgeHtml, purchaseOffer } from "../offer.js";
import { slugForCountyId } from "../place.js";
import { markConverted, createReminder } from "../reminders.js";
import { reminderMessage } from "../place-ui.js";
import { requireMatter, saveMatter } from "../store.js";

const ESTIMATE_LABEL = "Estimate from your numbers, if the county agrees to your value.";

const gate = requireMatter("checkout.html");
if (gate) {
  const { matter, user } = gate;
  const county = await getCounty(matter.countyId);
  const today = new Date();
  const season = filingWindow(county, today, matter.supplementalNoticeDate);
  const offer = purchaseOffer(county, today, matter.supplementalNoticeDate);
  const plans = CHECKOUT_PLANS.filter(plan => (plan.id === "dfy" ? offer.dfy : offer.diy));
  const root = document.querySelector("#checkout");
  if (!plans.length) {
    root.innerHTML = closedHtml(county, season, offer);
    mountOrderCountdowns(root);
    bindReminder(root, matter, county);
  } else if (matter.outcome === "no_go") {
    location.href = "results.html";
  } else {
    const savings = matter.savings && matter.savings.amount;
    const lines = planPriceLines(county);
    const notes = adapterFeeNotes(county).map(line => `<p class="small muted">${esc(line)}</p>`).join("");
    const limit = offerMessage(county, offer);
    root.innerHTML = `
      <h1>Choose a plan</h1>
      ${orderBadgeHtml(county)}
      <p class="lead">${esc(matter.address)}</p>
      ${limit ? `<p>${esc(limit)}</p>` : ""}
      <form id="pay" class="wide">
        <div class="plans">
          ${plans.map(plan => cardHtml(plan, lines, savings)).join("")}
        </div>
        ${notes}
        <p class="small muted">Simulated Stripe. The card is saved and not charged. There is no card field.</p>
        <button class="btn" type="submit">Continue</button>
      </form>`;
    document.querySelector("#pay").addEventListener("submit", async e => {
      e.preventDefault();
      if (!e.target.reportValidity()) return;
      const plan = plans.find(p => p.id === new FormData(e.target).get("plan"));
      if (!plan) return;
      const liveOffer = purchaseOffer(county, new Date(), matter.supplementalNoticeDate);
      const stillOpen = plan.id === "dfy" ? liveOffer.dfy : liveOffer.diy;
      if (!stillOpen) {
        root.innerHTML = closedHtml(county, filingWindow(county, new Date(), matter.supplementalNoticeDate), liveOffer);
        mountOrderCountdowns(root);
        bindReminder(root, matter, county);
        return;
      }
      matter.attribution = matter.attribution || readAttribution();
      matter.userId = user.id;
      matter.planId = plan.id;
      const setup = await paymentsAdapter.saveCard({
        userId: user.id,
        matterId: matter.id,
        plan,
        attribution: matter.attribution
      });
      matter.setupIntentId = setup.id;
      matter.cardSavedAt = setup.createdAt;
      matter.chargeStatus = "card_saved";
      matter.paymentTimingNote = plan.timingFlag || "";
      matter.paymentId = null;
      matter.paidAt = null;
      matter.src = setup.src;
      saveMatter(matter);
      if (matter.email) {
        try { await markConverted({ email: matter.email, county_slug: slugForCountyId(matter.countyId) }); }
        catch (err) { /* conversion is a reminder flag; checkout still continues */ }
      }
      location.href = "intake.html";
    });
    mountOrderCountdowns(root);
  }
}

function closedHtml(county, window, offer) {
  const win = (county.filing && county.filing.regular_window) || {};
  const source = win.source_url ? `<a href="${esc(win.source_url)}">${esc(win.source_url)}</a>` : "not set on this adapter";
  const verified = win.verified_date ? formatDay(win.verified_date) : "not set on this adapter";
  const closed = !offer || offer.closed || window.state !== "open";
  const title = closed ? "The filing window is closed" : "Checkout is not open for this county";
  const lead = closed
    ? "Checkout cannot proceed. This county's filing window is not open on the adapter."
    : (offerMessage(county, offer) || "We file it is not for sale in this county.");
  const windowLine = closed
    ? `<p>${esc(nextWindowCopy(county, new Date()))}</p>`
    : (orderBadgeHtml(county) || "<p>The filing window on this adapter is open. Purchase is not available.</p>");
  const informal = closed && county.informal_review
    ? `<h2>Free informal review</h2><p>${esc(county.informal_review)}</p>`
    : "";
  const supplementalText = county.filing && county.filing.supplemental_window;
  const supplemental = supplementalText && !/unverified template/i.test(supplementalText)
    ? `<p>${esc(supplementalText)}</p>`
    : "";
  return `
    <h1>${esc(title)}</h1>
    <p class="lead">${esc(lead)}</p>
    <div class="card">
      ${windowLine}
      <ul>${(window.reasons || []).map(r => `<li>${esc(r)}</li>`).join("")}</ul>
      ${informal}
      ${supplemental}
      <p>Deadline source: ${source}</p>
      <p>Verified: ${esc(verified)}</p>
      <form id="remind-form" class="wide">
        <label>Email<input name="email" type="email" required placeholder="you@example.com"></label>
        <button class="btn" type="submit">Email me a reminder</button>
        <p id="remind-ok" class="small muted" hidden></p>
      </form>
    </div>
    <div class="cta"><a class="btn ghost" href="results.html">Back to your result</a></div>`;
}

function bindReminder(root, matter, county) {
  const form = root.querySelector("#remind-form");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const email = String(new FormData(form).get("email") || "").trim();
    const result = await createReminder({
      email,
      county_slug: slugForCountyId(matter.countyId),
      address: matter.address,
      marketing_consent: true,
      consent_source: "checkout_unavailable"
    });
    const ok = form.querySelector("#remind-ok");
    if (ok) {
      ok.hidden = false;
      ok.textContent = reminderMessage(result);
    }
    form.querySelector("button").disabled = true;
  });
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
