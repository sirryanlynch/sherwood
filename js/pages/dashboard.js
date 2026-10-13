import "../boot.js";
import { notify } from "../adapters/notify.js";
import { paymentsAdapter } from "../adapters/payments.js";
import { authAdapter } from "../adapters/auth.js";
import { getCounty } from "../counties.js";
import { contactLine, esc, formatDay, isoDay, money } from "../format.js";
import { parseNotice } from "../notices.js";
import { HEARING_ADDON, MONITOR } from "../pricing.js";
import { currentMatter, requireMatter, saveMatter, loadDb } from "../store.js";

const STAGES = [
  ["filed", "Filed"],
  ["acknowledged", "County acknowledged"],
  ["assessor_review", "Assessor review"],
  ["hearing_scheduled", "Hearing scheduled"],
  ["decision", "Decision"],
  ["refund", "Corrected bill / refund"],
  ["monitor", "Annual monitor"]
];

const gate = requireMatter("dashboard.html");
if (!gate) {
  /* redirected */
} else {
  const county = await getCounty(gate.matter.countyId);
  paint(gate.matter, gate.user, county);
}

function paint(matter, user, county) {
  const root = document.querySelector("#dashboard");
  const stage = matter.stage && STAGES.some(([id]) => id === matter.stage) ? matter.stage : null;
  const expectations = (stage && county.stage_expectations && county.stage_expectations[stage]) || [
    "Nothing has been filed from this browser yet.",
    ...(county.filing.paper_steps || [])
  ];
  const timeline = STAGES.map(([id, label]) => {
    const on = id === stage;
    return `<li class="stage${on ? " now" : ""}"><b>${esc(label)}</b>${on ? " — now" : ""}</li>`;
  }).join("");
  const stipulation = stage === "assessor_review" ? `
    <h2>Stipulation decision</h2>
    <p>A stipulation would be an agreement on value instead of a hearing. The pilot kit has no stipulation form. Sherwood does not tell you which way to choose. Accepting here only continues the demo.</p>
    <div class="cta">
      <a class="btn" href="sign.html?round=3">Accept and sign (simulated round 3)</a>
      <button class="btn ghost" id="decline" type="button">Decline</button>
    </div>
    <p class="small muted">${matter.signatures && matter.signatures.stipulation ? "A simulated signature is on file." : ""} ${matter.stipulationDecision ? esc(matter.stipulationDecision) : ""}</p>` : "";
  const hearing = stage === "hearing_scheduled" ? `
    <h2>Hearing</h2>
    <p>Format, from the adapter: ${esc(county.hearing.format)}</p>
    <p>${esc(county.hearing.notice)}</p>
    <p>Preview date: ${esc(matter.hearing && matter.hearing.date ? formatDay(matter.hearing.date) : "none")} ${matter.hearing && matter.hearing.simulated ? "(simulated preview, not a county notice)" : ""}</p>
    <ul>${(county.hearing.prep || []).map(item => `<li>${esc(item)}</li>`).join("")}</ul>
    <p>${esc(HEARING_ADDON.summary)}</p>
    <button class="btn ghost" id="addon" type="button">${matter.hearingAddon ? "Quote requested" : "Request a hearing-support quote"}</button>` : "";
  const decision = stage === "decision" ? `
    <h2>Decision preview</h2>
    <p>No county decision is loaded. These buttons only restate your own numbers.</p>
    <div class="cta">
      <button class="btn ghost" type="button" data-decision="reduction">Preview using your opinion of value</button>
      <button class="btn ghost" type="button" data-decision="unchanged">Preview no change</button>
      <button class="btn ghost" type="button" data-decision="increase">Preview the increase risk</button>
    </div>
    <p id="decision-copy">${esc(matter.decisionNote || "")}</p>` : "";
  const monitor = stage === "monitor" ? `
    <h2>Annual monitor</h2>
    <p>${esc(MONITOR.summary)} Price on this site: ${esc(money(MONITOR.price))}/yr. Simulated enrollment. Nothing is billed to a card.</p>
    <button class="btn" id="enroll" type="button" ${matter.monitor ? "disabled" : ""}>${matter.monitor ? "Enrolled in this browser" : "Enroll"}</button>` : "";

  root.innerHTML = `
    <h1>Your appeal</h1>
    <p class="lead">${esc(matter.address)}. ${esc(county.county)} (${esc(county.status_label)}).</p>
    ${matter.outcome === "borderline" && !matter.reviewed ? `<p class="note">This check is in the human-review queue. Filing stays blocked until it is marked reviewed, unless you used the demo preview.</p>` : ""}
    <div class="split">
      <div>
        <h2>Timeline</h2>
        <ul class="tl">${timeline}</ul>
        <p class="small muted">Expected timing from this adapter:</p>
        <ul>${(county.timelines || []).map(row => `<li>${esc(row.text)}</li>`).join("")}</ul>
        <h2>What to expect now</h2>
        <ul>${expectations.map(line => `<li>${esc(line)}</li>`).join("")}</ul>
        ${stipulation}${hearing}${decision}${monitor}
        <h2>Demo control</h2>
        <p class="small muted">Moves the preview one stage. It does not contact the county. Reminders in the build brief are 60, 30, and 7 days before a deadline; those emails are not sent.</p>
        <button class="btn" id="advance" type="button">Advance one stage</button>
        <p id="advance-note" class="small muted"></p>
      </div>
      <div>
        <h2>Notices</h2>
        <p class="small muted">Forward county mail by pasting it or choosing a text file. We only keyword-match. A person still reads it.</p>
        <form id="notice-form">
          <label>County mail<textarea name="body" rows="5" required></textarea></label>
          <label>Or a text file<input name="file" type="file" accept=".txt,text/plain"></label>
          <button class="btn" type="submit">Save notice</button>
        </form>
        <div id="notice-list"></div>
        <h2>Notifications</h2>
        <form id="prefs">
          <label class="check"><input type="checkbox" name="email" ${user.prefs.email ? "checked" : ""}> Email</label>
          <label class="check"><input type="checkbox" name="sms" ${user.prefs.sms ? "checked" : ""}> SMS</label>
          <label>Mobile number<input name="phone" value="${esc(user.prefs.phone || "")}" placeholder="Only stored in this browser"></label>
          <button class="btn ghost" type="submit">Save preferences</button>
        </form>
        <h2>Simulated outbox</h2>
        <div data-outbox class="small muted"></div>
        <p>Clerk: ${esc(contactLine(county.filing.clerk))}</p>
        ${county.filing.portal_url ? `<p><a href="${esc(county.filing.portal_url)}">County portal</a></p>` : ""}
      </div>
    </div>`;

  renderNotices(matter);
  renderOutbox();

  document.querySelector("#advance").addEventListener("click", async () => {
    if (stage === "assessor_review" && !matter.stipulationDecision && !(matter.signatures && matter.signatures.stipulation)) {
      document.querySelector("#advance-note").textContent = "Accept or decline the stipulation preview before advancing. This is the demo control, not the county.";
      return;
    }
    const order = STAGES.map(([id]) => id);
    const idx = stage ? order.indexOf(stage) : -1;
    const next = order[Math.min(idx + 1, order.length - 1)];
    if (stage === "monitor") return;
    matter.stage = next;
    matter.stageHistory.push({ stage: next, at: new Date().toISOString(), simulated: true });
    if (next === "hearing_scheduled") {
      const minDays = county.hearing.notice_minimum_days;
      if (typeof minDays === "number") {
        const date = new Date();
        date.setDate(date.getDate() + minDays);
        matter.hearing = { date: isoDay(date), simulated: true, minimumDays: minDays };
      } else {
        matter.hearing = { date: null, simulated: true, note: "This adapter has no minimum notice period, so no preview date was invented." };
      }
    }
    saveMatter(matter);
    await ping(user, `Demo stage is now ${next}. This message was not sent.`);
    paint(matter, sessionUserFresh(user), county);
  });

  const decline = document.querySelector("#decline");
  if (decline) decline.addEventListener("click", () => {
    matter.stipulationDecision = "Declined in the demo. No document was signed.";
    saveMatter(matter);
    paint(matter, user, county);
  });
  const addon = document.querySelector("#addon");
  if (addon) addon.addEventListener("click", () => {
    matter.hearingAddon = { requestedAt: new Date().toISOString(), price: null, note: HEARING_ADDON.summary };
    saveMatter(matter);
    paint(matter, user, county);
  });
  document.querySelectorAll("[data-decision]").forEach(button => {
    button.addEventListener("click", () => {
      const kind = button.getAttribute("data-decision");
      if (kind === "reduction") {
        const savings = matter.savings && matter.savings.amount;
        matter.decisionNote = savings == null
          ? `If the board used your opinion of value, the assessed reduction would be ${money(matter.reduction)}. No tax bill was entered, so no refund dollars are shown.`
          : `If the board used your opinion of value, the assessed reduction would be ${money(matter.reduction)}, about ${money(savings)} on the bill you entered. Estimate only.`;
      } else if (kind === "unchanged") {
        matter.decisionNote = "Preview: assessment unchanged. Estimated savings $0. The kit says the board can also leave the value as it is.";
      } else {
        matter.decisionNote = "The adapter says the board can increase the assessment. This demo does not invent a higher number.";
      }
      matter.decisionPreview = kind;
      saveMatter(matter);
      paint(matter, user, county);
    });
  });
  const enroll = document.querySelector("#enroll");
  if (enroll) enroll.addEventListener("click", async () => {
    const payment = await paymentsAdapter.charge({ userId: user.id, matterId: matter.id, plan: MONITOR, amount: MONITOR.price });
    matter.monitor = { paymentId: payment.id, at: payment.createdAt, price: MONITOR.price, simulated: true };
    saveMatter(matter);
    await ping(user, "Annual monitor enrollment recorded in this browser. Not billed.");
    paint(matter, user, county);
  });
  const noticeForm = document.querySelector("#notice-form");
  if (noticeForm) noticeForm.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    let body = form.querySelector("textarea").value.trim();
    const fileInput = form.querySelector("input[type=file]");
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (file) body = `${body}\n${await file.text()}`.trim();
    const parsed = parseNotice(body);
    matter.notices.push({ at: new Date().toISOString(), body, ...parsed });
    saveMatter(matter);
    form.reset();
    paint(matter, user, county);
  });
  const prefsForm = document.querySelector("#prefs");
  if (prefsForm) prefsForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = new FormData(e.target);
    await authAdapter.updatePrefs(user.id, {
      email: data.get("email") === "on",
      sms: data.get("sms") === "on",
      phone: String(data.get("phone") || "")
    });
    paint(currentMatter(), sessionUserFresh(user), county);
  });
}

function sessionUserFresh(fallback) {
  const db = loadDb();
  return db.users.find(u => u.id === fallback.id) || fallback;
}

function renderNotices(matter) {
  const list = document.querySelector("#notice-list");
  if (!list) return;
  const rows = (matter.notices || []).slice().reverse();
  list.innerHTML = rows.length ? rows.map(row => `<div class="card"><p>${esc(row.body)}</p><p class="small muted">${esc(row.note)} ${row.suggestion ? `Suggested stage: ${esc(row.suggestion)}.` : ""}</p></div>`).join("") : `<p class="small muted">No notices saved.</p>`;
}

function renderOutbox() {
  const box = document.querySelector("#dashboard").querySelector("[data-outbox]");
  if (!box) return;
  const rows = notify.list().slice(0, 6);
  box.innerHTML = rows.length ? rows.map(row => `<p>${esc(row.channel)} · ${esc(row.kind || "note")} · ${esc(row.body)}</p>`).join("") : "<p>No simulated messages yet.</p>";
}

async function ping(user, body) {
  if (user.prefs.email) await notify.outbox({ channel: "email", to: user.email, kind: "status", simulated: true, body });
  if (user.prefs.sms && user.prefs.phone) await notify.outbox({ channel: "sms", to: user.prefs.phone, kind: "status", simulated: true, body });
}
