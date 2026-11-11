import { updateDb } from "../store.js";
import { uid } from "../format.js";

/* Real county e-file replaces submit(). This records a simulated confirmation only. */
export const efileAdapter = {
  name: "simulated-county-efile",
  async submit({ matter, county }) {
    const filing = county.filing || {};
    if (!filing.efile) {
      return {
        ok: false,
        simulated: true,
        method: "paper",
        reason: "Your county's details have no e-file portal.",
        steps: filing.paper_steps || []
      };
    }
    if (!filing.portal_url) {
      return {
        ok: false,
        simulated: true,
        method: "efile",
        reason: "Your county's details are marked for e-file but have no portal URL.",
        steps: []
      };
    }
    const fee = filing.efile_fee && typeof filing.efile_fee.amount === "number" ? filing.efile_fee.amount : null;
    const record = {
      id: uid("file"),
      simulated: true,
      matterId: matter.id,
      countyId: county.id,
      portalUrl: filing.portal_url,
      fee,
      feeLabel: filing.efile_fee && filing.efile_fee.label,
      filedAt: new Date().toISOString(),
      status: "submitted"
    };
    updateDb(db => { db.filings.push(record); });
    return { ok: true, ...record };
  }
};
