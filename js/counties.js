let cache = null;

export async function loadCounties() {
  if (cache) return cache;
  const indexUrl = new URL("../data/counties/index.json", import.meta.url);
  const names = await (await fetch(indexUrl)).json();
  const list = [];
  for (const name of names) {
    const url = new URL(`../data/counties/${name}`, import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${name}`);
    list.push(await res.json());
  }
  cache = list;
  return list;
}

export async function getCounty(id) {
  const all = await loadCounties();
  return all.find(c => c.id === id) || null;
}
