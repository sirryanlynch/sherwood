import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AGENT_CONTACT } from "./authorization.js";
import { HEARING_STATEMENT, hearingAckHtml, hearingAckState } from "./pricing.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const STATEMENT = "We prepare your evidence, file your appeal, and work toward an informal reduction or settlement with the Assessor. If your case goes to a hearing, you attend (in person or by video where the county allows) using a hearing packet we prepare. If no one attends, the board will deny the appeal.";

test("the hearing statement replaces the hearing-support add-on", () => {
  assert.equal(HEARING_STATEMENT, STATEMENT);
  const dfy = hearingAckState("dfy");
  const diy = hearingAckState("diy");
  assert.equal(dfy.visible, true);
  assert.equal(dfy.required, true);
  assert.equal(dfy.checked, false);
  assert.equal(diy.visible, false);
  assert.equal(diy.required, false);
  assert.equal(diy.checked, false);

  const html = hearingAckHtml("dfy");
  assert.equal(/\schecked(?:=|\s|>)/.test(html), false);
  assert.match(html, /name="hearingAck"/);
  assert.match(html, /\srequired(?:\s|>)/);
  assert.ok(html.includes(STATEMENT));
  assert.equal(html.includes("$149"), false);
  assert.equal(html.includes("Hearing support"), false);

  const hidden = hearingAckHtml("");
  assert.equal(/\schecked(?:=|\s|>)/.test(hidden), false);
  assert.match(hidden, /\shidden(?:\s|>)/);
  assert.equal(/\srequired(?:\s|>)/.test(hidden), false);

  for (const path of ["pricing.html", "trust.html", "js/pricing.js"]) {
    assert.ok(read(path).includes(STATEMENT), path);
  }
  for (const path of ["pricing.html", "trust.html", "js/pages/checkout.js", "js/pages/dashboard.js", "js/pages/sign.js", "js/pricing.js"]) {
    const source = read(path);
    assert.equal(source.includes("$149"), false, path);
    assert.equal(source.includes("Hearing support"), false, path);
    assert.equal(source.includes("quoted per case"), false, path);
    assert.equal(source.includes("HEARING_ADDON"), false, path);
    assert.equal(source.includes("hearing-support"), false, path);
  }
  assert.match(read("js/pages/checkout.js"), /HEARING_STATEMENT/);
  assert.match(read("js/pages/dashboard.js"), /HEARING_STATEMENT/);
  assert.match(read("js/pages/sign.js"), /HEARING_STATEMENT/);

  const sign = read("js/pages/sign.js");
  assert.match(sign, /named agent to sign filings only/);
  assert.match(sign, /The named agent signs filings only/);
  assert.match(sign, /Agent name:/);
  assert.match(sign, /Agent address:/);
  assert.match(sign, /Agent phone:/);
  assert.equal(AGENT_CONTACT.name, "[pending]");
  assert.equal(AGENT_CONTACT.address, "[pending]");
  assert.equal(AGENT_CONTACT.phone, "[pending]");

  const dashboard = read("js/pages/dashboard.js");
  assert.equal(dashboard.includes("Request a hearing-support quote"), false);
  assert.equal(dashboard.includes("hearingAddon"), false);

  const checkout = read("js/pages/checkout.js");
  assert.match(checkout, /formData\.get\("hearingAck"\) !== "on"/);
  assert.match(checkout, /hearingAcknowledgment/);
});
