import test from "node:test";
import assert from "node:assert/strict";
import { countyBySlug } from "./place.js";
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

test("a county param alone is not stored", () => {
  const store = memory();
  assert.equal(captureFirstTouch("?county=santa-cruz", store), null);
  assert.equal(store.getItem(ATTR_KEY), null);
  const later = captureFirstTouch("?src=mail1", store);
  assert.equal(later.src, "mail1");
  assert.equal(attributionPayload(store).src, "mail1");
});
