/** Calendar-day notices for a county filing window. `today` is YYYY-MM-DD in America/Los_Angeles. */

function laToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(iso, days) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function dueNotices({ today, windowStart, windowEnd, sentKinds, confirmed, status, converted }) {
  if (!confirmed || status === "unsubscribed" || status === "sent") return [];
  const sent = new Set(sentKinds || []);
  const notices = [];
  if (windowStart) {
    const heads = addDays(windowStart, -14);
    if (today >= heads && today < windowStart && !sent.has("heads_up_14")) notices.push("heads_up_14");
    const openEnd = windowEnd || "9999-12-31";
    if (today >= windowStart && today <= openEnd && !sent.has("open_day")) notices.push("open_day");
  }
  if (windowEnd && !converted) {
    const nudge = addDays(windowEnd, -14);
    if (today >= nudge && today <= windowEnd && !sent.has("deadline_14")) notices.push("deadline_14");
  }
  return notices;
}

function campaignFinished(today, windowEnd) {
  return Boolean(windowEnd) && today > windowEnd;
}

function windowOf(county) {
  const win = county && county.filing && county.filing.regular_window;
  if (!win) return { start: null, end: null, label: "" };
  return {
    start: win.start || null,
    end: win.end || null,
    label: win.label || ""
  };
}

module.exports = { laToday, addDays, dueNotices, campaignFinished, windowOf };
