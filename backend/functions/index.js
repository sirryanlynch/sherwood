const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAppCheck } = require("firebase-admin/app-check");
const { validateReminderInput, validateLeadInput, validateConvertedInput, validateMonitorInput, nextRate } = require("./validate");
const { buildEmail, deliver, sendingConfig } = require("./email");
const { statutoryDisclosureHtml } = require("./disclosure");
const { dueNotices, campaignFinished, renewalNoticeDue, laToday, windowOf } = require("./window");
const { retainUntil, renewsOn } = require("./retention");
const { loadBundled, findCounty } = require("./counties");

initializeApp();
const db = getFirestore();

const SECRETS = [
  "MAIL_POSTAL_ADDRESS",
  "MAIL_FROM",
  "RESEND_API_KEY",
  "PUBLIC_FUNCTIONS_BASE_URL"
];

function cors(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-Firebase-AppCheck");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

function fail(res, error) {
  const status = error.status || 400;
  res.status(status).json({ ok: false, error: error.message || "Request failed." });
}

async function enforceAppCheck(req) {
  if (String(process.env.APP_CHECK_ENFORCED || "") !== "true") return;
  const token = req.get("X-Firebase-AppCheck");
  if (!token) {
    const err = new Error("App Check token required.");
    err.status = 401;
    throw err;
  }
  await getAppCheck().verifyToken(token);
}

function clientIp(req) {
  const fwd = req.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || req.ip || "unknown").trim().slice(0, 80);
}

async function rateLimit(req) {
  const id = crypto.createHash("sha256").update(clientIp(req)).digest("hex");
  const ref = db.collection("rate_limits").doc(id);
  const now = Date.now();
  const decision = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() : { count: 0, windowStartMs: 0 };
    const next = nextRate({ count: cur.count, windowStartMs: cur.windowStartMs, now });
    if (next.allow) tx.set(ref, { count: next.count, windowStartMs: next.windowStartMs });
    return next;
  });
  if (!decision.allow) {
    const err = new Error("Too many requests. Try again later.");
    err.status = 429;
    throw err;
  }
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

async function countyList() {
  const snap = await db.collection("counties").limit(50).get();
  if (!snap.empty) return snap.docs.map(doc => doc.data());
  return loadBundled();
}

function mailLinks(row) {
  const base = sendingConfig().base;
  return {
    unsubscribeUrl: `${base}/unsubscribe?token=${encodeURIComponent(row.unsubscribe_token)}`,
    confirmUrl: row.confirm_token ? `${base}/confirmReminder?token=${encodeURIComponent(row.confirm_token)}` : ""
  };
}

async function sendKind({ kind, to, row, county, win, outcome }) {
  const links = mailLinks(row);
  const mail = buildEmail({
    kind,
    countyName: county && county.county,
    windowLabel: win && win.label,
    windowStart: win && win.start,
    windowEnd: win && win.end,
    confirmUrl: links.confirmUrl,
    unsubscribeUrl: links.unsubscribeUrl,
    postal: sendingConfig().postal,
    outcome,
    today: laToday()
  });
  await deliver({ to, subject: mail.subject, text: mail.text, html: mail.html });
}

async function existingReminder(email, countySlug) {
  const snap = await db.collection("reminders").where("email", "==", email).limit(20).get();
  return snap.docs.find(doc => {
    const row = doc.data();
    return row.county_slug === countySlug && row.status === "pending";
  }) || null;
}

const httpsOpts = { secrets: SECRETS, invoker: "public" };

exports.createReminder = onRequest(httpsOpts, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only." });
  try {
    await enforceAppCheck(req);
    await rateLimit(req);
    const parsed = validateReminderInput(req.body);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.errors.join(" ") });
    const value = parsed.value;
    const counties = await countyList();
    const county = findCounty(counties, value.county_slug);
    const win = windowOf(county);
    const prior = await existingReminder(value.email, value.county_slug);
    let rowRef = prior && prior.ref;
    let row = prior && prior.data();
    if (!row) {
      const confirm_token = token();
      const unsubscribe_token = token();
      const created = {
        email: value.email,
        county_slug: value.county_slug,
        address: value.address,
        window_opens_at: win.start,
        status: "pending",
        created_at: FieldValue.serverTimestamp(),
        unsubscribe_token,
        confirm_token,
        marketing_consent: true,
        consent_source: value.consent_source,
        consent_requested_at: FieldValue.serverTimestamp(),
        confirmed_at: null,
        sent_kinds: [],
        converted_at: null,
        src: value.src,
        utm: value.utm
      };
      rowRef = await db.collection("reminders").add(created);
      row = { ...created, unsubscribe_token, confirm_token };
    } else {
      const patch = {};
      if (!row.src && value.src) patch.src = value.src;
      const hasUtm = row.utm && typeof row.utm === "object" && Object.keys(row.utm).length;
      if (!hasUtm && value.utm && Object.keys(value.utm).length) patch.utm = value.utm;
      if (Object.keys(patch).length) {
        await rowRef.update(patch);
        row = { ...row, ...patch };
      }
    }
    let email_sent = false;
    if (!row.confirmed_at && sendingConfig().ok) {
      try {
        await sendKind({ kind: "confirm", to: value.email, row, county, win });
        email_sent = true;
      } catch (err) {
        console.error("confirm email failed", err.message);
      }
    }
    res.json({ ok: true, email_sent, already: Boolean(row.confirmed_at) });
  } catch (err) {
    fail(res, err);
  }
});

exports.createLead = onRequest(httpsOpts, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only." });
  try {
    await enforceAppCheck(req);
    await rateLimit(req);
    const parsed = validateLeadInput(req.body);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.errors.join(" ") });
    const value = parsed.value;
    const unsubscribe_token = token();
    await db.collection("leads").add({
      ...value,
      unsubscribe_token,
      created_at: FieldValue.serverTimestamp()
    });
    let email_sent = false;
    if (sendingConfig().ok) {
      try {
        const counties = await countyList();
        const county = findCounty(counties, value.county_slug);
        await sendKind({
          kind: "result",
          to: value.email,
          row: { unsubscribe_token },
          county,
          win: windowOf(county),
          outcome: value.outcome
        });
        email_sent = true;
      } catch (err) {
        console.error("result email failed", err.message);
      }
    }
    res.json({ ok: true, email_sent });
  } catch (err) {
    fail(res, err);
  }
});

exports.markConverted = onRequest(httpsOpts, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only." });
  try {
    await enforceAppCheck(req);
    await rateLimit(req);
    const parsed = validateConvertedInput(req.body);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.errors.join(" ") });
    const snap = await db.collection("reminders").where("email", "==", parsed.value.email).limit(20).get();
    const batch = db.batch();
    let n = 0;
    snap.docs.forEach(doc => {
      const row = doc.data();
      if (row.status !== "pending") return;
      if (parsed.value.county_slug && row.county_slug !== parsed.value.county_slug) return;
      batch.update(doc.ref, { converted_at: FieldValue.serverTimestamp() });
      n += 1;
    });
    if (n) await batch.commit();
    res.json({ ok: true, updated: n });
  } catch (err) {
    fail(res, err);
  }
});

exports.confirmReminder = onRequest(httpsOpts, async (req, res) => {
  try {
    const confirmToken = String(req.query.token || "");
    if (!confirmToken) return res.status(400).send(page("Missing token", "This link has no token."));
    const snap = await db.collection("reminders").where("confirm_token", "==", confirmToken).limit(1).get();
    if (snap.empty) return res.status(404).send(page("Link not found", "This confirmation link does not match a reminder."));
    const doc = snap.docs[0];
    const row = doc.data();
    if (row.status === "unsubscribed") {
      return res.status(200).send(page("Unsubscribed", "This reminder is already unsubscribed."));
    }
    if (!row.confirmed_at) {
      await doc.ref.update({ confirmed_at: FieldValue.serverTimestamp() });
    }
    res.status(200).send(page(
      "Reminder confirmed",
      "You will get the filing-window emails for this county."
    ));
  } catch (err) {
    res.status(500).send(page("Something went wrong", "The confirmation could not be saved."));
  }
});

exports.unsubscribe = onRequest(httpsOpts, async (req, res) => {
  try {
    const unsub = String(req.query.token || "");
    if (!unsub) return res.status(400).send(page("Missing token", "This link has no token."));
    let doc = null;
    for (const name of ["reminders", "leads"]) {
      const snap = await db.collection(name).where("unsubscribe_token", "==", unsub).limit(1).get();
      if (!snap.empty) {
        doc = snap.docs[0];
        break;
      }
    }
    if (!doc) return res.status(404).send(page("Link not found", "This unsubscribe link does not match a record."));
    await doc.ref.update({
      status: "unsubscribed",
      unsubscribed_at: FieldValue.serverTimestamp()
    });
    res.status(200).send(page(
      "Unsubscribed",
      "You will not get more reminder emails for this record."
    ));
  } catch (err) {
    res.status(500).send(page("Something went wrong", "The unsubscribe could not be saved."));
  }
});

exports.createMonitor = onRequest(httpsOpts, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only." });
  try {
    await enforceAppCheck(req);
    await rateLimit(req);
    const parsed = validateMonitorInput(req.body);
    if (!parsed.ok) return res.status(400).json({ ok: false, error: parsed.errors.join(" ") });
    const now = new Date().toISOString();
    const cancel_token = token();
    const row = {
      email: parsed.value.email,
      price: 49,
      interval: "year",
      renewal_consent: true,
      consented_at: FieldValue.serverTimestamp(),
      retain_until: retainUntil(now),
      renews_on: renewsOn(now),
      cancel_token,
      status: "active",
      renewal_notice_sent: false,
      created_at: FieldValue.serverTimestamp()
    };
    const ref = await db.collection("monitors").add(row);
    let email_sent = false;
    if (sendingConfig().ok) {
      try {
        const stored = { ...row, cancel_token };
        await sendMonitor({ kind: "monitor_confirm", to: parsed.value.email, row: stored });
        email_sent = true;
      } catch (err) {
        console.error("monitor confirmation failed", err.message);
      }
    }
    res.json({ ok: true, id: ref.id, email_sent, retain_until: row.retain_until });
  } catch (err) {
    fail(res, err);
  }
});

exports.cancelMonitor = onRequest(httpsOpts, async (req, res) => {
  try {
    const cancelToken = String(req.query.token || "");
    if (!cancelToken) return res.status(400).send(page("Missing token", "This link has no token."));
    const snap = await db.collection("monitors").where("cancel_token", "==", cancelToken).limit(1).get();
    if (snap.empty) return res.status(404).send(page("Link not found", "This cancel link does not match an annual monitor."));
    const doc = snap.docs[0];
    const row = doc.data();
    if (row.status !== "canceled") {
      await doc.ref.update({
        status: "canceled",
        canceled_at: FieldValue.serverTimestamp()
      });
    }
    res.status(200).send(page(
      "Annual monitor canceled",
      "The annual monitor will not renew. The consent record is kept for 3 years."
    ));
  } catch (err) {
    res.status(500).send(page("Something went wrong", "The cancellation could not be saved."));
  }
});

async function sendMonitor({ kind, to, row }) {
  const base = sendingConfig().base;
  const cancelUrl = `${base}/cancelMonitor?token=${encodeURIComponent(row.cancel_token)}`;
  const mail = buildEmail({
    kind,
    countyName: "your county",
    unsubscribeUrl: cancelUrl,
    cancelUrl,
    postal: sendingConfig().postal
  });
  await deliver({ to, subject: mail.subject, text: mail.text, html: mail.html });
}

exports.sendDueReminders = onSchedule({
  schedule: "0 8 * * *",
  timeZone: "America/Los_Angeles",
  secrets: SECRETS
}, async () => {
  if (!sendingConfig().ok) {
    console.error("Skipping reminder send. Missing " + sendingConfig().missing.join(", "));
    return;
  }
  const today = laToday();
  const counties = await countyList();
  const snap = await db.collection("reminders").where("status", "==", "pending").get();
  for (const doc of snap.docs) {
    const row = doc.data();
    if (!row.confirmed_at) continue;
    const county = findCounty(counties, row.county_slug);
    const win = windowOf(county);
    const kinds = dueNotices({
      today,
      windowStart: win.start,
      windowEnd: win.end,
      sentKinds: row.sent_kinds || [],
      confirmed: true,
      status: row.status,
      converted: Boolean(row.converted_at)
    });
    const sent = new Set(row.sent_kinds || []);
    for (const kind of kinds) {
      try {
        await sendKind({ kind, to: row.email, row, county, win });
        sent.add(kind);
      } catch (err) {
        console.error("scheduled email failed", doc.id, kind, err.message);
      }
    }
    await doc.ref.update({
      sent_kinds: [...sent],
      status: campaignFinished(today, win.end) ? "sent" : "pending",
      updated_at: FieldValue.serverTimestamp()
    });
  }
  const monitors = await db.collection("monitors").where("status", "==", "active").get();
  for (const doc of monitors.docs) {
    const row = doc.data();
    if (!renewalNoticeDue({
      today,
      renewsOn: row.renews_on,
      alreadySent: row.renewal_notice_sent === true,
      status: row.status
    })) continue;
    try {
      await sendMonitor({ kind: "renewal", to: row.email, row });
      await doc.ref.update({
        renewal_notice_sent: true,
        renewal_notice_on: today,
        updated_at: FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("renewal notice failed", doc.id, err.message);
    }
  }
});

function page(title, body) {
  const esc = String(body).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  const safeTitle = String(title).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  return `<!doctype html><meta charset="utf-8"><title>${safeTitle}</title>${statutoryDisclosureHtml()}<h1 style="font-size:20px;line-height:1.35;font-weight:700">${safeTitle}</h1><p>${esc}</p>`;
}
