import { readAttribution } from "./attribution.js";
import { uid } from "./format.js";

const DB_KEY = "sherwood_db_v1";
const USER_KEY = "sherwood_user";
const MATTER_KEY = "sherwood_matter";

function blank() {
  return { users: [], matters: [], notices: [], payments: [], outbox: [], envelopes: [], filings: [], monitors: [] };
}

export function loadDb() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DB_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.matters)) return blank();
    return { ...blank(), ...parsed };
  } catch (e) {
    return blank();
  }
}

export function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function updateDb(mutator) {
  const db = loadDb();
  mutator(db);
  saveDb(db);
  return db;
}

export function sessionUser() {
  const id = sessionStorage.getItem(USER_KEY);
  if (!id) return null;
  return loadDb().users.find(u => u.id === id) || null;
}

export function setSessionUser(id) {
  if (id) sessionStorage.setItem(USER_KEY, id);
  else sessionStorage.removeItem(USER_KEY);
}

export function currentMatter() {
  const id = sessionStorage.getItem(MATTER_KEY);
  if (!id) return null;
  return loadDb().matters.find(m => m.id === id) || null;
}

export function setCurrentMatter(id) {
  if (id) sessionStorage.setItem(MATTER_KEY, id);
  else sessionStorage.removeItem(MATTER_KEY);
}

export function saveMatter(matter) {
  updateDb(db => {
    const i = db.matters.findIndex(m => m.id === matter.id);
    if (i >= 0) db.matters[i] = matter;
    else db.matters.push(matter);
  });
  setCurrentMatter(matter.id);
  return matter;
}

export function newMatter(partial) {
  const matter = {
    id: uid("matter"),
    createdAt: new Date().toISOString(),
    stage: null,
    stageHistory: [],
    signatures: {},
    uploads: [],
    notices: [],
    waitlist: false,
    reviewed: false,
    demoPreview: false,
    attribution: readAttribution(),
    ...partial
  };
  return saveMatter(matter);
}

export function requireMatter(next) {
  const matter = currentMatter();
  if (!matter) {
    location.href = "index.html";
    return null;
  }
  const user = sessionUser();
  if (!user) {
    location.href = `login.html?next=${encodeURIComponent(next || location.pathname.split("/").pop() || "dashboard.html")}`;
    return null;
  }
  if (matter.userId && matter.userId !== user.id) {
    location.href = "dashboard.html";
    return null;
  }
  return { matter, user };
}
