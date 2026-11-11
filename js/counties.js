let cache = null;
const byId = new Map();

async function readJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Could not load ${url}`);
  return res.json();
}

/* One county file. Demo and case pages must not wait on the other 57 adapters. */
export async function getCounty(id) {
  if (!id) return null;
  if (byId.has(id)) return byId.get(id);
  const url = new URL(`../data/counties/${id}.json`, import.meta.url);
  try {
    const county = await readJson(url);
    byId.set(county.id || id, county);
    return county;
  } catch (e) {
    return null;
  }
}

export async function loadCounties() {
  if (cache) return cache;
  const indexUrl = new URL("../data/counties/index.json", import.meta.url);
  const names = await readJson(indexUrl);
  const list = await Promise.all(names.map(async name => {
    const url = new URL(`../data/counties/${name}`, import.meta.url);
    const county = await readJson(url);
    if (county && county.id) byId.set(county.id, county);
    return county;
  }));
  cache = list;
  return list;
}

/* Customer copy cites the board named on the adapter. The pilot-kit status label stays internal. */
export function customerCountyLine(county) {
  if (!county) return "";
  const board = county.appeals_board && county.appeals_board.name;
  const usable = board && !/unverified template/i.test(board) ? board : "";
  if (usable) {
    const place = county.county || "";
    if (place && !usable.toLowerCase().includes(place.toLowerCase())) return `${place} County ${usable}`;
    return usable;
  }
  const label = county.status_label || "";
  if (/pilot kit/i.test(label)) return "";
  return label;
}
