import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = join(root, "data", "counties");
const dest = join(root, "backend", "functions", "counties");
mkdirSync(dest, { recursive: true });
for (const name of readdirSync(src)) {
  if (!name.endsWith(".json")) continue;
  copyFileSync(join(src, name), join(dest, name));
}
console.log("Copied county adapters into backend/functions/counties");
