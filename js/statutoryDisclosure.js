/* B&P 17537.9 disclosure. Draft pending an attorney. The sentence is fixed.
   Every page keeps this sentence inside the footer Disclosures dialog.
   DISCLOSURE_TOP_FOR_CAMPAIGN is false, so no page renders a box at the top. */
import { CONFIG } from "./config.js";
import { readAttribution } from "./attribution.js";

export const STATUTORY_DISCLOSURE = "This assessment reduction filing service is not associated with any government agency. If you disagree with the assessed value of your property, you have the right to an informal assessment review, at no cost, by contacting the assessor's office directly. If you and the assessor cannot agree to the value of the property or if you do not wish to contact the assessor you can obtain and file an application for changed assessment with the county board of equalization or assessment appeals board on your own behalf. An appeals board has the authority to raise property values (but in no case higher than the Proposition 13 protected value) as well as to lower property values.";

export const DISCLOSURES_URL = "https://sirryanlynch.github.io/sherwood/disclosures/";

export function statutoryDisclosureHtml() {
  return `<div class="statutory-disclosure disclosure" role="note"><p><b>${STATUTORY_DISCLOSURE}</b></p></div>`;
}

export function campaignTopDisclosure(src, config = CONFIG) {
  if (!config || !config.DISCLOSURE_TOP_FOR_CAMPAIGN) return false;
  if (typeof src !== "string" || !src) return false;
  if (src === "social" || src === "search") return true;
  return src.startsWith("postcard-");
}

export function mountStatutoryDisclosure(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-statutory-disclosure]").forEach(host => {
    host.outerHTML = statutoryDisclosureHtml();
  });
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function bindDisclosureDialog() {
  if (typeof document === "undefined") return;
  if (document.documentElement.dataset.disclosureBound === "1") return;
  const dialog = document.getElementById("disclosure-dialog");
  if (!dialog) return;
  document.documentElement.dataset.disclosureBound = "1";

  let lastFocus = null;

  function focusable() {
    return [...dialog.querySelectorAll(FOCUSABLE)].filter(el => !el.closest("[hidden]"));
  }

  function openDialog(opener) {
    lastFocus = opener || document.activeElement;
    dialog.hidden = false;
    const closeBtn = dialog.querySelector("[data-disclosure-close]");
    (closeBtn || dialog).focus();
  }

  function closeDialog() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  document.querySelectorAll("[data-disclosure-open]").forEach(opener => {
    opener.addEventListener("click", () => openDialog(opener));
  });
  dialog.querySelectorAll("[data-disclosure-close]").forEach(btn => {
    btn.addEventListener("click", closeDialog);
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });
  document.addEventListener("keydown", event => {
    if (dialog.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !dialog.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  });

  const row = readAttribution();
  mountCampaignDisclosure(row && row.src);
}

export function mountCampaignDisclosure(src) {
  if (typeof document === "undefined") return;
  if (!campaignTopDisclosure(src)) return;
  if (document.querySelector("[data-campaign-disclosure]")) return;
  const header = document.querySelector("header");
  if (!header) return;
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  wrap.setAttribute("data-campaign-disclosure", "");
  wrap.innerHTML = statutoryDisclosureHtml();
  header.before(wrap);
}
