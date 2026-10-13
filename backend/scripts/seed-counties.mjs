import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../functions/package.json"));
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const dir = join(here, "../functions/counties");
initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const names = readdirSync(dir).filter(name => name.endsWith(".json") && name !== "index.json");
for (const name of names) {
  const data = JSON.parse(readFileSync(join(dir, name), "utf8"));
  await db.collection("counties").doc(data.id).set(data);
  console.log("seeded", data.id);
}
