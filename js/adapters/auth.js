import { loadDb, saveDb, setSessionUser, updateDb } from "../store.js";
import { uid } from "../format.js";
import { notify } from "./notify.js";

/* Real auth replaces issueMagicLink and consumeMagicLink.
   Nothing here contacts a mail server. */
export const authAdapter = {
  name: "simulated-magic-link",
  async issueMagicLink(email) {
    const clean = String(email || "").trim().toLowerCase();
    if (!clean.includes("@")) throw new Error("Enter a valid email.");
    const db = loadDb();
    let user = db.users.find(u => u.email === clean);
    if (!user) {
      user = {
        id: uid("user"),
        email: clean,
        createdAt: new Date().toISOString(),
        prefs: { email: true, sms: false, phone: "" }
      };
      db.users.push(user);
    }
    const token = uid("link");
    user.magicToken = token;
    user.magicIssuedAt = new Date().toISOString();
    saveDb(db);
    const url = `login.html?token=${encodeURIComponent(token)}`;
    await notify.outbox({
      channel: "email",
      to: clean,
      kind: "magic-link",
      simulated: true,
      body: `Sign-in link (not sent): ${url}`
    });
    return { simulated: true, email: clean, token, url };
  },
  async consumeMagicLink(token) {
    const db = loadDb();
    const user = db.users.find(u => u.magicToken === token);
    if (!user) return null;
    user.magicToken = null;
    user.lastLoginAt = new Date().toISOString();
    saveDb(db);
    setSessionUser(user.id);
    return user;
  },
  async signOut() {
    setSessionUser(null);
  },
  async updatePrefs(userId, prefs) {
    updateDb(db => {
      const user = db.users.find(u => u.id === userId);
      if (user) user.prefs = { ...user.prefs, ...prefs };
    });
  }
};
