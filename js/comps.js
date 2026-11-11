/* Comparable sales stay locked. No placeholder dollars, and nothing when there is no estimate. */
export function compsBlockHtml(matter) {
  const savings = matter && matter.savings;
  const high = savings && savings.high;
  if (typeof high !== "number" || !(high > 0)) return "";
  return `<div class="card" aria-label="Comparable sales locked">
    <p class="muted small" style="margin-top:0">Comparable sales <span class="chip chip-sample">Sample</span></p>
    <p class="blur" aria-hidden="true">Sample street · not this home</p>
    <p class="small muted" style="margin-bottom:0">Locked because this demo does not have comparable sales for your address. We do not invent them.</p>
  </div>`;
}
