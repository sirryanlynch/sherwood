import { captureFirstTouch } from "./js/attribution.js";
import { startPlace, rememberAddress } from "./js/place-ui.js";
import { bindDisclosureDialog } from "./js/statutoryDisclosure.js";

captureFirstTouch();
bindDisclosureDialog();
mountCompactNav();

function mountCompactNav() {
  if (!document.body.classList.contains("mkt")) return;
  const header = document.querySelector("header");
  const nav = header && header.querySelector("nav");
  const wrap = header && header.querySelector(".wrap");
  if (!header || !nav || !wrap || header.querySelector(".nav-menu")) return;
  nav.id = nav.id || "site-nav";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-menu";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", nav.id);
  btn.innerHTML = '<span class="sr-only">Menu</span>';
  wrap.appendChild(btn);
  const setOpen = open => {
    header.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  btn.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));
  nav.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setOpen(false);
  });
}

const FORM_ENDPOINT = "";

function store(kind, data) {
  const key = "sherwood_" + kind;
  const all = JSON.parse(localStorage.getItem(key) || "[]");
  all.push({ ...data, submittedAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(all));
}
async function send(kind, data) {
  store(kind, data);
  if (!FORM_ENDPOINT) return true;
  try {
    const r = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ form: kind, ...data })
    });
    return r.ok;
  } catch (e) { return false; }
}
function validate(form) {
  let ok = true;
  form.querySelectorAll(".err").forEach(e => e.remove());
  form.querySelectorAll("[required],[type=email],[pattern]").forEach(el => {
    el.classList.remove("invalid");
    if (!el.checkValidity()) {
      ok = false;
      el.classList.add("invalid");
      const m = document.createElement("div");
      m.className = "err";
      m.textContent = el.dataset.msg || el.validationMessage;
      (el.closest("label") || el).after(m);
    }
  });
  if (!ok) {
    const f = form.querySelector(".invalid");
    if (f) f.focus();
  }
  return ok;
}

document.querySelectorAll("form[data-kind]").forEach(form => {
  form.noValidate = true;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!validate(form)) return;
    const data = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll("input[type=checkbox]").forEach(c => { data[c.name] = c.checked; });
    const kind = form.dataset.kind;
    const btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    if (kind === "check") {
      const place = rememberAddress(data.address);
      data.countySlug = place.slug || "";
      data.countyLabel = place.label || "";
      data.placeStatus = place.status;
      data.placeSource = place.source;
      sessionStorage.setItem("sherwood_check", JSON.stringify(data));
      const nested = /\/(santa-cruz|san-diego|san-mateo|santa-barbara)(\/|$)/.test(location.pathname);
      location.href = nested ? "../values.html" : "values.html";
      return;
    }
    const sent = await send(kind, data);
    form.outerHTML = `<div class="ok" role="status"><b>Received.</b> ${form.dataset.thanks || "We'll be in touch by email."}${sent ? "" : " (Saved on this device; we couldn't reach the server — please try again later.)"}</div>`;
  });
});

const chk = JSON.parse(sessionStorage.getItem("sherwood_check") || "null");
document.querySelectorAll("[data-fill=address]").forEach(el => { if (chk) el.textContent = chk.address; });
document.querySelectorAll("input[name=address]").forEach(el => {
  if (chk && !el.value && el.closest("form[data-kind=intake]")) el.value = chk.address || "";
});

await startPlace();
