/* Same sentence as js/statutoryDisclosure.js. Every email template. */
const STATUTORY_DISCLOSURE = "This assessment reduction filing service is not associated with any government agency. If you disagree with the assessed value of your property, you have the right to an informal assessment review, at no cost, by contacting the assessor's office directly. If you and the assessor cannot agree to the value of the property or if you do not wish to contact the assessor you can obtain and file an application for changed assessment with the county board of equalization or assessment appeals board on your own behalf. An appeals board has the authority to raise property values (but in no case higher than the Proposition 13 protected value) as well as to lower property values.";

const DISCLOSURE_PX = 20;
const H1_PX = 18;
const BODY_PX = 16;
const LOGO_URL = "https://sirryanlynch.github.io/sherwood/logo.png";

function statutoryDisclosureHtml() {
  return `<div class="disclosure statutory-disclosure" role="note" style="display:block;font-size:${DISCLOSURE_PX}px;font-weight:700;line-height:1.35;text-transform:none;border:1px solid currentColor;padding:11px 16px;margin:0 0 28px"><p style="max-width:960px;margin:0 auto;font-size:${DISCLOSURE_PX}px;line-height:1.35;font-weight:700">${escapeHtml(STATUTORY_DISCLOSURE)}</p></div>`;
}

function logoHtml() {
  return `<p style="margin:0 0 16px;font-size:${BODY_PX}px;line-height:1.5"><img src="${LOGO_URL}" alt="Sherwood" width="209" height="33" style="display:block;border:0;height:28px;width:177px"></p>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

module.exports = { STATUTORY_DISCLOSURE, statutoryDisclosureHtml, logoHtml, DISCLOSURE_PX, H1_PX, BODY_PX, LOGO_URL };
