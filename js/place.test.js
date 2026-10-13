import test from "node:test";
import assert from "node:assert/strict";
import {
  headlinePlace, parseAddressPlace, classifyIp, resolvePlace, countyBySlug, displayLabel
} from "./place.js";

test("headline uses a typed city or a county param, never an IP city", () => {
  assert.equal(headlinePlace(), "your");
  assert.equal(headlinePlace({ ipCity: "Cupertino" }), "your");
  assert.equal(headlinePlace({
    address: "1 Infinite Loop, Cupertino, CA 95014",
    ipCity: "Santa Cruz"
  }), "Cupertino");
  assert.equal(headlinePlace({
    param: countyBySlug("santa-cruz"),
    ipCity: "Cupertino"
  }), "Santa Cruz");
  assert.equal(headlinePlace({ address: "95060" }), "Santa Cruz");
});

test("Cupertino with no county is ambiguous", () => {
  const ip = classifyIp({ ok: true, city: "Cupertino", region: "California", county: "" });
  assert.equal(ip.status, "ambiguous");
  assert.equal(ip.confident, false);
});

test("an IP county that is not Santa Cruz is non-launch", () => {
  const ip = classifyIp({ ok: true, city: "Cupertino", county: "Santa Clara County" });
  assert.equal(ip.status, "other");
  assert.equal(ip.label, "Santa Clara County");
});

test("an IP county of Santa Cruz is launch", () => {
  const ip = classifyIp({ ok: true, city: "Cupertino", county: "Santa Cruz County" });
  assert.equal(ip.status, "launch");
  assert.equal(ip.slug, "santa-cruz");
});

test("a typed Santa Cruz address overrides a Cupertino IP city", () => {
  const addressPlace = parseAddressPlace("100 Main St, Santa Cruz, CA 95060");
  addressPlace.addressKey = "100 main st, santa cruz, ca 95060";
  const place = resolvePlace({
    param: null,
    stored: null,
    addressPlace,
    ipPlace: classifyIp({ ok: true, city: "Cupertino", county: "" })
  });
  assert.equal(place.status, "launch");
  assert.equal(place.source, "address");
});

test("a typed Cupertino address is non-launch and overrides an IP county", () => {
  const addressPlace = parseAddressPlace("1 Infinite Loop, Cupertino, CA 95014");
  addressPlace.addressKey = "1 infinite loop, cupertino, ca 95014";
  const place = resolvePlace({
    param: null,
    stored: null,
    addressPlace,
    ipPlace: classifyIp({ ok: true, city: "Santa Cruz", county: "Santa Cruz County" })
  });
  assert.equal(place.status, "other");
  assert.equal(place.label, "Cupertino");
});

test("?county=santa-cruz overrides the address and the IP result", () => {
  const addressPlace = parseAddressPlace("1 Infinite Loop, Cupertino, CA 95014");
  const place = resolvePlace({
    param: countyBySlug("santa-cruz"),
    stored: null,
    addressPlace,
    ipPlace: classifyIp({ ok: true, city: "Cupertino", county: "Santa Clara County" })
  });
  assert.equal(place.source, "url");
  assert.equal(place.slug, "santa-cruz");
  assert.equal(displayLabel(place), "Santa Cruz County");
});

test("a saved correction is kept until a different address is typed", () => {
  const stored = {
    status: "launch", slug: "santa-cruz", id: "santa_cruz", label: "Santa Cruz County",
    source: "user", confident: true, addressKey: "100 main st"
  };
  const same = parseAddressPlace("100 Main St, Santa Cruz, CA");
  same.addressKey = "100 main st";
  assert.equal(resolvePlace({ param: null, stored, addressPlace: same, ipPlace: null }).source, "user");
  const next = parseAddressPlace("1 Infinite Loop, Cupertino, CA 95014");
  next.addressKey = "1 infinite loop, cupertino, ca 95014";
  assert.equal(resolvePlace({ param: null, stored, addressPlace: next, ipPlace: null }).label, "Cupertino");
});

test("ambiguous IP does not display a city as the county", () => {
  const place = resolvePlace({
    param: null,
    stored: null,
    addressPlace: null,
    ipPlace: classifyIp({ ok: true, city: "Cupertino", region: "California", county: "" })
  });
  assert.equal(place.status, "ambiguous");
  assert.equal(displayLabel(place), "your county");
});
