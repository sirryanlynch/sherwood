import "../boot.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { money, esc } from "../format.js";
import { PLANS } from "../pricing.js";
import { getCounty } from "../counties.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("checkout.html");
if (gate) {
  const { matter, user } = gate;
  if ((matter.outcome === "no_go" || matter.outcome === "off_season") && !matter.demoPreview) {
    location.href = "results.html";
  } else {
    const county = await getCounty(matter.countyId);
    const root = document.querySelector("#checkout");
    const savings = matter.savings && matter.savings.amount;
    root.innerHTML = `
      <h1>Choose a plan</h1>
      <p class="lead">${esc(matter.address)}. Sherwood's price is separate from the county fee.</p>
      <form id="pay" class="wide">
        ${PLANS.map((plan, i) => {
          let price = plan.price == null ? "No Sherwood fee today" : money(plan.dueToday);
          let extra = "";
          if (plan.rate) {
            extra = savings == null
              ? "35% of first-year savings. We can't compute a dollar figure until a tax bill is on the check."
              : `35% of the estimated ${money(savings)} would be about ${money(savings * plan.rate)}, and only if a reduction is granted.`;
          }
          return `<label class="check"><input type="radio" name="plan" value="${plan.id}" ${i === 1 ? "checked" : ""}> <span><b>${esc(plan.name)}</b> — ${esc(price)}<br><span class="muted">${esc(plan.summary)} ${esc(extra)}</span></span></label>`;
        }).join("")}
        <div class="card">
          <h3>County fee, not charged here</h3>
          <p class="muted" style="margin:0">${esc(countyFeeText(county))}</p>
        </div>
        <p class="small muted">Simulated Stripe. There is no card field. Pressing the button writes a local payment record only.</p>
        <button class="btn" type="submit">Simulate payment and continue</button>
      </form>`;
    document.querySelector("#pay").addEventListener("submit", async e => {
      e.preventDefault();
      const plan = PLANS.find(p => p.id === new FormData(e.target).get("plan"));
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
      location.href = "intake.html";
    });
  }
}

function countyFeeText(county) {
  const filing = county.filing || {};
  if (filing.efile && filing.efile_fee) return filing.efile_fee.label || "E-file fee is not a number on this adapter.";
  if (filing.paper_fee) return filing.paper_fee.label || "Paper fee is not a number on this adapter.";
  return "This adapter has no fee to show.";
}
