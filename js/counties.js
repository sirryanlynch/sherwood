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
