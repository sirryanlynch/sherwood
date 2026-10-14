/* B&P 17537.9 disclosure. Draft pending an attorney. The sentence is fixed.
   Every page includes this sentence as static HTML above the header. */
export const STATUTORY_DISCLOSURE = "This assessment reduction filing service is not associated with any government agency. If you disagree with the assessed value of your property, you have the right to an informal assessment review, at no cost, by contacting the assessor's office directly. If you and the assessor cannot agree to the value of the property or if you do not wish to contact the assessor you can obtain and file an application for changed assessment with the county board of equalization or assessment appeals board on your own behalf. An appeals board has the authority to raise property values (but in no case higher than the Proposition 13 protected value) as well as to lower property values.";

export function statutoryDisclosureHtml() {
  return `<div class="statutory-disclosure disclosure" role="note"><p><b>${STATUTORY_DISCLOSURE}</b></p></div>`;
}

export function mountStatutoryDisclosure(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-statutory-disclosure]").forEach(host => {
    host.outerHTML = statutoryDisclosureHtml();
  });
}
