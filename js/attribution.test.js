import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { countyBySlug } from "./place.js";
import { STATUTORY_DISCLOSURE } from "./statutoryDisclosure.js";
import { ATTR_KEY, attributionPayload, captureFirstTouch, touchFromSearch } from "./attribution.js";

function memory() {
  const data = new Map();
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value))
  };
}

test("src and utm are read beside county", () => {
  const search = "?county=santa-cruz&src=mail1&utm_source=letter&utm_campaign=oct";
  const params = new URLSearchParams(search);
  assert.equal(countyBySlug(params.get("county")).slug, "santa-cruz");
  const touch = touchFromSearch(search);
  assert.equal(touch.src, "mail1");
  assert.deepEqual(touch.utm, { utm_source: "letter", utm_campaign: "oct" });
});

test("first touch is kept when a later visit has a different src", () => {
  const store = memory();
  const first = captureFirstTouch("?county=santa-cruz&src=mail1", store);
  const second = captureFirstTouch("?src=mail2&utm_medium=email", store);
  assert.equal(first.src, "mail1");
  assert.equal(second.src, "mail1");
  assert.equal(JSON.parse(store.getItem(ATTR_KEY)).src, "mail1");
});

test("src=search is kept beside a county landing", () => {
  const store = memory();
  const touch = captureFirstTouch("?src=search", store);
  assert.equal(touch.src, "search");
  assert.equal(touchFromSearch("?src=search").src, "search");
  assert.equal(captureFirstTouch("?county=santa-cruz", store).src, "search");
});

test("src=postcard-scz is stored from the Santa Cruz forward", () => {
  const html = readFileSync(new URL("../scz/index.html", import.meta.url), "utf8");
  const dest = "../santa-cruz/?county=santa-cruz&src=postcard-scz";
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${dest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(html, /location\.replace\("\.\.\/santa-cruz\/\?county=santa-cruz&src=postcard-scz"\)/);
  const linkAt = html.indexOf(`<a href="${dest}">`);
  const boxAt = html.indexOf('class="statutory-disclosure');
  assert.ok(linkAt >= 0 && boxAt > linkAt);
  assert.match(html, /<footer[\s\S]*data-disclosure-open[^>]*>Disclosures<\/button>/);
  assert.equal(html.match(/role="dialog"[\s\S]*?<b>([\s\S]*?)<\/b>/)[1], STATUTORY_DISCLOSURE);
  const store = memory();
  const touch = captureFirstTouch("?county=santa-cruz&src=postcard-scz", store);
  assert.equal(touch.src, "postcard-scz");
  assert.equal(captureFirstTouch("?src=other", store).src, "postcard-scz");
  assert.equal(JSON.parse(store.getItem(ATTR_KEY)).src, "postcard-scz");
});

test("src=social is stored from the /sc/ forward", () => {
  const html = readFileSync(new URL("../sc/index.html", import.meta.url), "utf8");
  const dest = "../santa-cruz/?county=santa-cruz&src=social";
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${dest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(html, /location\.replace\("\.\.\/santa-cruz\/\?county=santa-cruz&src=social"\)/);
  const linkAt = html.indexOf(`<a href="${dest}">`);
  const boxAt = html.indexOf('class="statutory-disclosure');
  assert.ok(linkAt >= 0 && boxAt > linkAt);
  assert.match(html, /<footer[\s\S]*data-disclosure-open[^>]*>Disclosures<\/button>/);
  assert.equal(html.match(/role="dialog"[\s\S]*?<b>([\s\S]*?)<\/b>/)[1], STATUTORY_DISCLOSURE);
  const store = memory();
  const touch = captureFirstTouch("?county=santa-cruz&src=social", store);
  assert.equal(touch.src, "social");
  assert.equal(captureFirstTouch("?src=other", store).src, "social");
  assert.equal(JSON.parse(store.getItem(ATTR_KEY)).src, "social");
});

test("a county param alone is not stored", () => {
  const store = memory();
  assert.equal(captureFirstTouch("?county=santa-cruz", store), null);
  assert.equal(store.getItem(ATTR_KEY), null);
  const later = captureFirstTouch("?src=mail1", store);
  assert.equal(later.src, "mail1");
  assert.equal(attributionPayload(store).src, "mail1");
});
