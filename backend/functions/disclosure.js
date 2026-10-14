/* Same sentence as js/statutoryDisclosure.js. Every email template. */
const STATUTORY_DISCLOSURE = "THIS ASSESSMENT REDUCTION FILING SERVICE IS NOT ASSOCIATED WITH ANY GOVERNMENT AGENCY. IF YOU DISAGREE WITH THE ASSESSED VALUE OF YOUR PROPERTY, YOU HAVE THE RIGHT TO AN INFORMAL ASSESSMENT REVIEW, AT NO COST, BY CONTACTING THE ASSESSOR'S OFFICE DIRECTLY. IF YOU AND THE ASSESSOR CANNOT AGREE TO THE VALUE OF THE PROPERTY OR IF YOU DO NOT WISH TO CONTACT THE ASSESSOR YOU CAN OBTAIN AND FILE AN APPLICATION FOR CHANGED ASSESSMENT WITH THE COUNTY BOARD OF EQUALIZATION OR ASSESSMENT APPEALS BOARD ON YOUR OWN BEHALF. AN APPEALS BOARD HAS THE AUTHORITY TO RAISE PROPERTY VALUES (BUT IN NO CASE HIGHER THAN THE PROPOSITION 13 PROTECTED VALUE) AS WELL AS TO LOWER PROPERTY VALUES.";

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
