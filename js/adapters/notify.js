import { updateDb, loadDb } from "../store.js";
import { uid } from "../format.js";

/* Real email/SMS replaces outbox(). Messages are stored locally and not sent. */
export const notify = {
  name: "simulated-email-sms",
  async outbox(message) {
    const row = {
      id: uid("msg"),
      simulated: true,
      createdAt: new Date().toISOString(),
      ...message
    };
    updateDb(db => { db.outbox.push(row); });
    return row;
  },
  list() {
    return loadDb().outbox.slice().reverse();
  }
};
