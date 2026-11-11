import { saveDb, setCurrentMatter, setSessionUser } from "./store.js";

const DEMO_USER = "user_demo";
const DEMO_MATTER = "matter_demo";

/* A Santa Cruz session reviewers can open without typing the check. */
export function loadDemoCase() {
  const now = new Date().toISOString();
  const assessed = 1233915;
  const market = 1075000;
  const tax = 15176.44;
  const reduction = assessed - market;
  const rate = tax / assessed;
  const amount = reduction * rate;
  const user = {
    id: DEMO_USER,
    email: "reviewer@example.com",
    createdAt: now,
    prefs: { email: true, sms: false, phone: "" }
  };
  const matter = {
    id: DEMO_MATTER,
    createdAt: now,
    userId: user.id,
    address: "701 Ocean Street, Santa Cruz, CA",
    email: user.email,
    countyId: "santa_cruz",
    assessed,
    market,
    marketSkipped: false,
    tax,
    confidence: "sure",
    outcome: "go",
    reasons: ["Reviewer demo. Simulated case, not a county filing."],
    reduction,
    savings: {
      amount,
      rate,
      low: amount * 0.5,
      mid: amount,
      high: amount,
      note: "Estimate only. Simulated demo.",
      bandNote: "Simulated demo band."
    },
    fee: 50,
    window: { state: "open", kind: "regular", reasons: [], label: "July 2 through November 30, 2026" },
    planId: "dfy",
    setupIntentId: "seti_demo",
    cardSavedAt: now,
    chargeStatus: "card_saved",
    cardCheck: { status: "succeeded", amount: 0, at: now, setupIntentId: "seti_demo", reason: "", force: false },
    hearingAcknowledgment: { acceptedAt: now },
    intake: {
      address: "701 Ocean Street, Santa Cruz, CA",
      apn: "001-001-01",
      type: "Single-family home",
      ownerOccupied: "Yes",
      name: "Reviewer",
      email: user.email,
      phone: "8315550100",
      ownerConfirm: true,
      agentAuth: true,
      risks: true
    },
    kit: {
      approvedAt: now,
      statement: "Simulated statement of facts for the reviewer demo. Not a county form.",
      shortText: "Simulated."
    },
    stage: null,
    stageHistory: [],
    signatures: {},
    uploads: [],
    notices: [],
    reviewed: true,
    demo: true,
    attribution: null
  };
  const db = {
    users: [user],
    matters: [matter],
    notices: [],
    payments: [{
      id: "seti_demo",
      object: "setup_intent",
      status: "card_saved",
      simulated: true,
      amount: 0,
      userId: user.id,
      matterId: matter.id,
      planId: "dfy"
    }],
    outbox: [],
    envelopes: [],
    filings: [],
    monitors: []
  };
  saveDb(db);
  setSessionUser(user.id);
  setCurrentMatter(matter.id);
  try { sessionStorage.setItem("sherwood_demo", "1"); } catch (e) { /* ignore */ }
  return matter;
}

export function maybeLoadDemo() {
  if (typeof location === "undefined") return;
  if (new URLSearchParams(location.search).get("demo") !== "1") return;
  loadDemoCase();
}
