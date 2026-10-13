import { updateDb } from "../store.js";
import { uid } from "../format.js";

/* Real DocuSign replaces createEnvelope and sign.
   The screen is a model of an embedded signing ceremony, not a DocuSign session. */
export const docusignAdapter = {
  name: "simulated-docusign",
  async createEnvelope({ matterId, round, stepId, title }) {
    const envelope = {
      id: uid("env"),
      provider: "docusign",
      simulated: true,
      matterId,
      round,
      stepId,
      title,
      status: "sent",
      createdAt: new Date().toISOString(),
      completedAt: null,
      signerName: null
    };
    updateDb(db => { db.envelopes.push(envelope); });
    return envelope;
  },
  async sign({ envelopeId, signerName }) {
    let signed = null;
    updateDb(db => {
      const env = db.envelopes.find(e => e.id === envelopeId);
      if (!env) return;
      env.status = "completed";
      env.signerName = signerName;
      env.completedAt = new Date().toISOString();
      signed = env;
    });
    return signed;
  }
};
