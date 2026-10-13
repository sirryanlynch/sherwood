import "../boot.js";
import { authAdapter } from "../adapters/auth.js";
import { esc } from "../format.js";
import { currentMatter, saveMatter, sessionUser } from "../store.js";

const params = new URLSearchParams(location.search);
const next = params.get("next") || "checkout.html";
const token = params.get("token");
const root = document.querySelector("#login");

if (sessionUser() && !token) {
  location.href = next;
} else if (token) {
  const user = await authAdapter.consumeMagicLink(token);
  if (!user) {
    root.innerHTML = `<h1>That link is not valid</h1><p>Request a new simulated sign-in link.</p><p><a href="login.html?next=${esc(next)}">Back</a></p>`;
  } else {
    const matter = currentMatter();
    if (matter && !matter.userId) {
      matter.userId = user.id;
      saveMatter(matter);
    }
    root.innerHTML = `<h1>You're signed in</h1><p class="lead">${esc(user.email)}. This session stays in this browser.</p><div class="cta"><a class="btn" href="${esc(next)}">Continue</a></div>`;
  }
} else {
  const matter = currentMatter();
  const suggested = matter && matter.email || "";
  root.innerHTML = `
    <h1>Sign in</h1>
    <p class="lead">Magic link, simulated. We do not send email. The link appears below so you can continue.</p>
    <form id="magic" class="wide">
      <label>Email<input name="email" type="email" required value="${esc(suggested)}"></label>
      <button class="btn" type="submit">Create sign-in link</button>
    </form>
    <div id="link-box"></div>`;
  document.querySelector("#magic").addEventListener("submit", async e => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    const issued = await authAdapter.issueMagicLink(email);
    const href = `${issued.url}${issued.url.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}`;
    document.querySelector("#link-box").innerHTML = `
      <div class="card">
        <p class="small muted" style="margin-top:0">Simulated inbox for ${esc(issued.email)}. Nothing was emailed.</p>
        <p><a class="btn" href="${esc(href)}">Open the simulated magic link</a></p>
      </div>`;
  });
}
