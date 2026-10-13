import "../boot.js";
import { getCounty } from "../counties.js";
import { esc } from "../format.js";
import { contactLine } from "../format.js";
import { planById } from "../pricing.js";
import { requireMatter, saveMatter } from "../store.js";

const gate = requireMatter("intake.html");
if (gate) {
  const { matter } = gate;
  if (!matter.planId) location.href = "checkout.html";
  else {
    const county = await getCounty(matter.countyId);
    const plan = planById(matter.planId);
    const root = document.querySelector("#intake");
    const exemption = county.homeowner_exemption;
    root.innerHTML = `
      <h1>Intake</h1>
      <p class="lead">${esc(plan.name)} for ${esc(matter.address)}. ${esc(county.county)} (${esc(county.status_label)}).</p>
      <form id="intake-form" class="wide">
        <fieldset><legend>Property</legend>
          <label>Address<input name="address" required value="${esc(matter.address)}"></label>
          <label>APN<input name="apn" required placeholder="From your tax bill"></label>
          <label>Property type<select name="type" required><option value="">Select…</option><option>Single-family home</option><option>Townhouse</option><option>Condominium</option><option>Other residential</option></select></label>
          <p class="small muted">Assessed value already entered: ${esc(String(matter.assessed))}. Opinion of value: ${esc(String(matter.market))}.</p>
        </fieldset>
        <fieldset><legend>Occupancy and exemption</legend>
          <label>Is this your primary residence?<select name="ownerOccupied" required><option value="">Select…</option><option>Yes</option><option>No</option></select></label>
          <label>Homeowner's Exemption already on file?<select name="hoExemption"><option>Not sure</option><option>Yes</option><option>No</option></select></label>
          <p class="small muted" id="exemption-note"></p>
        </fieldset>
        <fieldset><legend>Condition around the lien date</legend>
          <p class="small muted">Describe the property as it was. Photos are optional. This demo stores them in this browser only.</p>
          <label>Roof age in years<input name="roofAge" type="number" min="0" max="150" required></label>
          <label>Damage<textarea name="damage" rows="3" placeholder="None, or describe"></textarea></label>
          <label>Remodels<textarea name="remodels" rows="3"></textarea></label>
          <label>Systems<textarea name="systems" rows="3" placeholder="Heating, plumbing, electrical, solar"></textarea></label>
          <label>Photos or reports<input name="files" type="file" accept="image/*,.pdf" multiple></label>
          <p class="small muted" id="file-note"></p>
        </fieldset>
        <fieldset><legend>Who is signing</legend>
          <label>Full name<input name="name" required autocomplete="name"></label>
          <label>Email<input name="email" type="email" required value="${esc(matter.email || "")}"></label>
          <p class="privacy-note">We use your email and approximate location only to run your check and send what you ask for. <a href="privacy.html">Privacy policy</a>.</p>
          <label>Phone<input name="phone" type="tel" required></label>
          <label class="check"><input type="checkbox" name="ownerConfirm" required> I am an owner of this property, or otherwise entitled to file for it.</label>
          ${plan.filesAsAgent ? `<label class="check"><input type="checkbox" name="agentAuth" required> I will sign an agent authorization so Sherwood can prepare and file for this parcel and tax year. I will sign the application's certification myself.</label>` : `<p class="small muted">DIY kit: you file. Sherwood does not become your agent on this plan.</p>`}
          <label class="check"><input type="checkbox" name="risks" required> I understand Sherwood is not a law firm, results are not guaranteed, the board can raise an assessment, and I must keep paying taxes on time.</label>
        </fieldset>
        <button class="btn" type="submit">Save intake</button>
      </form>`;

    const note = document.querySelector("#exemption-note");
    const exemptionSelect = root.querySelector("[name=hoExemption]");
    const paintExemption = () => {
      if (!exemption) {
        note.textContent = "This county adapter has no Homeowner's Exemption facts. We will not quote a dollar figure.";
        return;
      }
      if (exemptionSelect.value === "Yes") {
        note.textContent = "You marked the exemption as already on file. We will not suggest claiming it again.";
        return;
      }
      note.textContent = `${exemption.note} Assessor: ${contactLine({ phone: exemption.phone, email: county.assessor_office.email })}`;
    };
    exemptionSelect.addEventListener("change", paintExemption);
    paintExemption();

    root.querySelector("#intake-form").addEventListener("submit", async e => {
      e.preventDefault();
      const form = e.target;
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      const uploads = [];
      for (const file of form.files.files) {
        if (file.size > 700000) {
          document.querySelector("#file-note").textContent = `${file.name} is over 700KB. This demo keeps files in local storage, so it was skipped.`;
          continue;
        }
        const dataUrl = await readFile(file);
        uploads.push({ name: file.name, type: file.type, size: file.size, dataUrl });
      }
      matter.intake = {
        address: data.address,
        apn: data.apn,
        type: data.type,
        ownerOccupied: data.ownerOccupied,
        hoExemption: data.hoExemption,
        roofAge: data.roofAge,
        damage: data.damage,
        remodels: data.remodels,
        systems: data.systems,
        name: data.name,
        email: data.email,
        phone: data.phone,
        ownerConfirm: true,
        agentAuth: Boolean(form.agentAuth && form.agentAuth.checked),
        risks: true
      };
      matter.uploads = uploads;
      matter.address = data.address;
      saveMatter(matter);
      location.href = "kit.html";
    });
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
