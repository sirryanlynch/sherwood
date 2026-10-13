import { asDate, parseISODate, money } from "./format.js";

/* Product review rule, not a legal standard and not a county rule. */
export const MATERIALITY_RATIO = 0.05;

export function feeAmount(county) {
  const filing = county && county.filing;
  if (!filing) return null;
  const preferred = filing.efile ? filing.efile_fee : filing.paper_fee;
  const amount = preferred && preferred.amount;
  return typeof amount === "number" ? amount : null;
}

export function savingsOf(assessed, reduction, tax) {
  if (tax == null || assessed == null || assessed <= 0 || reduction == null) {
    return {
      amount: null,
      rate: null,
      note: "No dollar savings yet. Your tax bill was not entered, and this check does not apply the pilot property's 1.23% rate to anyone else."
    };
  }
  const rate = tax / assessed;
  return {
    amount: reduction * rate,
    rate,
    note: "Estimate only: (assessed value − your market-value estimate) × (tax bill ÷ assessed value). This is your bill, not a countywide rate."
  };
}

function windowState(county, today, supplementalNoticeDate) {
  const win = county.filing && county.filing.regular_window;
  const reasons = [];
  const end = win && parseISODate(win.end);
  const start = win && parseISODate(win.start);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let regular = "unknown";
  if (end && day > end) regular = "closed";
  else if (start && day < start) regular = "before";
  else if (start && end && day >= start && day <= end) regular = "open";
  else regular = "unknown";

  const days = county.filing && county.filing.supplemental_days;
  let supplemental = "n/a";
  if (supplementalNoticeDate && days == null) {
    supplemental = "unverified";
    reasons.push("A supplemental notice date was entered, but this adapter does not state the number of days. A person has to check it.");
  } else if (supplementalNoticeDate && typeof days === "number") {
    const notice = parseISODate(supplementalNoticeDate);
    if (!notice) {
      supplemental = "bad_date";
      reasons.push("The supplemental notice date could not be read.");
    } else if (notice > day) {
      supplemental = "bad_date";
      reasons.push("The supplemental notice date is in the future.");
    } else {
      const last = new Date(notice.getFullYear(), notice.getMonth(), notice.getDate() + days);
      supplemental = day <= last ? "open" : "closed";
      if (supplemental === "closed") {
        reasons.push(`The supplemental window in this adapter is ${days} days from the notice, and that date has passed.`);
      }
    }
  }

  if (supplemental === "open") {
    return { state: "open", kind: "supplemental", reasons, label: county.filing.supplemental_window };
  }
  if (regular === "open") {
    return { state: "open", kind: "regular", reasons, label: win.label };
  }
  if (regular === "closed" || regular === "before" || supplemental === "closed") {
    const label = (win && win.label) || "not set";
    reasons.unshift(`Today is outside the regular filing window on this adapter (${label}).`);
    return { state: "off_season", kind: regular, reasons, label };
  }
  reasons.unshift("This adapter does not say when the filing window opens, so Sherwood will not treat it as open.");
  return { state: "unknown", kind: "regular", reasons, label: win && win.label };
}

export function decide(input) {
  const today = asDate(input.today || new Date());
  const county = input.county;
  const assessed = input.assessed;
  const market = input.market;
  if (!county) {
    return { outcome: "no_go", reasons: ["Choose a county that has an adapter."], window: null };
  }
  if (assessed == null || market == null || assessed <= 0 || market < 0) {
    return { outcome: "no_go", reasons: ["Enter the assessed value and your estimate of market value."], window: null };
  }
  const reduction = assessed - market;
  const savings = savingsOf(assessed, reduction, input.tax);
  const window = windowState(county, today, input.supplementalNoticeDate);
  const base = { reduction, savings, window, fee: feeAmount(county) };

  if (window.state === "off_season") {
    return { outcome: "off_season", reasons: window.reasons, ...base };
  }
  if (reduction <= 0) {
    return {
      outcome: "no_go",
      reasons: ["Your market-value estimate is not below the assessed value, so these numbers do not support a decline-in-value appeal."],
      ...base
    };
  }
  if (county.status !== "verified") {
    return {
      outcome: "borderline",
      reasons: [
        "This county file is an unverified template. Sherwood will not file from it until a person verifies the adapter.",
        ...window.reasons
      ],
      ...base
    };
  }
  if (window.state === "unknown") {
    return { outcome: "borderline", reasons: window.reasons, ...base };
  }
  if (input.confidence === "guess") {
    return {
      outcome: "borderline",
      reasons: ["You marked the market value as a rough guess. A person reviews it before Sherwood treats it as a Go."],
      ...base
    };
  }
  if (savings.amount != null && base.fee != null && savings.amount <= base.fee) {
    return {
      outcome: "borderline",
      reasons: [`Estimated first-year savings are not above the county filing fee on this adapter (${money(base.fee)}). A person should look before you pay a filing fee.`],
      ...base
    };
  }
  if (savings.amount == null && reduction / assessed < MATERIALITY_RATIO) {
    return {
      outcome: "borderline",
      reasons: [`The gap is under ${Math.round(MATERIALITY_RATIO * 100)}% of the assessed value, and no tax bill was entered to price it. That line is Sherwood's review rule, not a legal standard.`],
      ...base
    };
  }
  return {
    outcome: "go",
    reasons: ["The market value you entered is below the assessed value, and the filing window on this adapter is open."],
    ...base
  };
}
