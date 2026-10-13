const fs = require("fs");
const path = require("path");

function loadBundled() {
  const dir = path.join(__dirname, "counties");
  const names = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  return names.map(name => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
}

function findCounty(counties, slug) {
  if (!slug) return null;
  const id = String(slug).replace(/-/g, "_");
  return counties.find(c => c.id === id) || null;
}

module.exports = { loadBundled, findCounty };
