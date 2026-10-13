import "../boot.js";
import { getCounty } from "../counties.js";
import { esc } from "../format.js";
import { shortExplanation, statementOfFacts } from "../kitdoc.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("kit.html");
if (gate) {
  const { matter } = gate;
  if (!matter.intake) location.href = "intake.html";
  else {
    const county = await getCounty(matter.countyId);
    const statement = statementOfFacts(matter, county);
    const brief = shortExplanation(matter, county);
    const root = document.querySelector("#kit");
    root.innerHTML = `
      <h1>Review the kit</h1>
      <p class="lead">Sherwood prepared this from your intake and the ${esc(county.county)} adapter. It is a preview. You approve it before any signature step.</p>
      ${county.template_warning ? `<p class="note">${esc(county.template_warning)}</p>` : ""}
      <h2>Explanation box</h2>
      <p>${brief.limit ? `This adapter says the portal box holds about ${esc(String(brief.limit))} characters.` : "This adapter does not set an explanation-box length."}</p>
      <div class="card"><p style="margin:0">${esc(brief.text)}</p></div>
      <h2>Statement of Facts</h2>
      <pre class="card" style="white-space:pre-wrap;font:inherit">${esc(statement)}</pre>
      <h2>What the portal asks for</h2>
      ${(county.portal_sections || []).length ? `<ol class="steps">${county.portal_sections.map(s => `<li><h3>${esc(s.title)}</h3><span class="muted">${esc(s.enter)}</span></li>`).join("")}</ol>` : `<p>This adapter has no portal sections. ${esc(county.filing.method === "paper" ? "Paper steps are on the filing screen." : "Nothing else is listed.")}</p>`}
      <h2>Your files</h2>
      <p>${matter.uploads.length ? matter.uploads.map(f => esc(f.name)).join(", ") : "No files uploaded."}</p>
      <label class="check"><input type="checkbox" id="approve"> I reviewed this kit. It is not legal advice, and I am the one who will sign the certification.</label>
      <div class="cta"><button class="btn" id="continue" type="button" disabled>Approve and continue</button></div>`;
    const box = root.querySelector("#approve");
    const button = root.querySelector("#continue");
    box.addEventListener("change", () => { button.disabled = !box.checked; });
    button.addEventListener("click", () => {
      matter.kit = { approvedAt: new Date().toISOString(), statement, shortText: brief.text };
      saveMatter(matter);
      location.href = "sign.html?round=1";
    });
  }
}
