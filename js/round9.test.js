import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { STATUTORY_DISCLOSURE } from "./statutoryDisclosure.js";

const require = createRequire(import.meta.url);
const { buildEmail } = require("../backend/functions/email.js");

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCALE = ":root{--fs-disclosure:20px;--fs-h1:18px;--fs-h2:17px;--fs-body:16px;--fs-small:14px;--fs-micro:12px}";
const MOBILE_SCALE = "@media (max-width:480px){:root{--fs-disclosure:18px;--fs-h1:17px;--fs-h2:16px;--fs-body:15px}}";
const DISCLOSURE_RULE = ".disclosure{font-size:var(--fs-disclosure);font-weight:700;line-height:1.35;text-transform:none;border:1px solid currentColor;padding:11px 16px}";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function pageNames() {
  const names = readdirSync(ROOT).filter(name => name.endsWith(".html"));
  names.push("santa-cruz/index.html", "san-diego/index.html", "san-mateo/index.html", "santa-barbara/index.html", "scz/index.html", "sc/index.html");
  return names;
}

test("the design type scale is in the stylesheet and the logo is an image", () => {
  const css = read("../style.css");
  assert.ok(css.includes(SCALE));
  assert.ok(css.includes(MOBILE_SCALE));
  assert.ok(css.includes(DISCLOSURE_RULE));
  assert.ok(css.includes(".disclosure p{max-width:960px;margin:0 auto}"));
  assert.ok(css.includes("h1{font-size:var(--fs-h1);font-weight:700;line-height:1.3}"));
  assert.ok(css.includes("h2,h3,.card-title,.price{font-size:var(--fs-h2);font-weight:600;line-height:1.3}"));
  assert.ok(css.includes("body,p,button,.btn,.badge{font-size:var(--fs-body);line-height:1.5}"));
  assert.equal(css.includes("--type-disclosure"), false);
  assert.equal(css.includes("34px"), false);

  for (const name of pageNames()) {
    const html = readFileSync(join(ROOT, name), "utf8");
    const match = html.match(/<div class="statutory-disclosure disclosure"[^>]*>\s*<p><b>([\s\S]*?)<\/b><\/p>\s*<\/div>/);
    assert.equal(match && match[1], STATUTORY_DISCLOSURE, name);
    assert.equal(/<details[\s\S]*statutory-disclosure/.test(html), false, name);
    assert.equal(/<a class="logo"[^>]*>\s*Sherwood\s*<\/a>/.test(html), false, name);
    if (html.includes("<header")) {
      const nested = name.includes("/");
      const src = nested ? "../logo.png" : "logo.png";
      assert.match(html, new RegExp(`<a class="logo"[^>]*>\\s*<img [^>]*src="${src.replace(".", "\\.")}"[^>]*alt="Sherwood"`), name);
    }
  }
});

function startServer() {
  return new Promise(resolve => {
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png"
    };
    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/email-preview.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(emailPreview);
        return;
      }
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const file = normalize(join(ROOT, pathname));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("no");
        return;
      }
      try {
        let body = readFileSync(file);
        if ((pathname === "/scz/index.html" || pathname === "/sc/index.html") && url.searchParams.has("static")) {
          body = Buffer.from(body.toString("utf8")
            .replace(/<meta http-equiv="refresh"[^>]*>/, "")
            .replace(/<script>location\.replace[\s\S]*?<\/script>/, ""));
        }
        res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

let emailPreview = "";

function startChrome(port, dir) {
  return new Promise((resolve, reject) => {
    const proc = spawn("google-chrome", [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${port}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${dir}`,
      "--no-first-run",
      "about:blank"
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`chrome did not listen\n${buf.slice(-2000)}`));
    }, 20000);
    const onData = chunk => {
      buf += chunk.toString();
      if (!settled && buf.includes("DevTools listening")) {
        settled = true;
        clearTimeout(timer);
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`chrome exited ${code}\n${buf.slice(-2000)}`));
    });
  });
}

async function pageSocket(port) {
  for (let i = 0; i < 50; i++) {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const list = await res.json();
    const page = list.find(target => target.type === "page" && target.webSocketDebuggerUrl);
    if (page) return page.webSocketDebuggerUrl;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("no Chrome page target");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let seq = 0;
  ws.addEventListener("message", event => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  return {
    ws,
    ready,
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`timeout ${method}`));
        }, 15000);
        pending.set(id, {
          resolve: value => { clearTimeout(timer); resolve(value); },
          reject: err => { clearTimeout(timer); reject(err); }
        });
      });
    }
  };
}

const MEASURE = `(() => {
  const expected = ${JSON.stringify(STATUTORY_DISCLOSURE)};
  const box = document.querySelector(".statutory-disclosure");
  if (!box) return { error: "missing disclosure" };
  const px = el => parseFloat(getComputedStyle(el).fontSize);
  const boxSize = px(box);
  const textEl = box.querySelector("b, p");
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const size = px(el);
    if (el === box || box.contains(el)) {
      if (size > boxSize + 0.1) offenders.push({ where: "inside", tag: el.tagName, className: String(el.className).slice(0, 80), size });
      continue;
    }
    if (!(size < boxSize - 0.05)) {
      offenders.push({ where: "outside", tag: el.tagName, id: el.id || "", className: String(el.className).slice(0, 80), size });
    }
  }
  const pick = sel => {
    const el = document.querySelector(sel);
    return el ? px(el) : null;
  };
  const logo = document.querySelector("a.logo");
  const cs = getComputedStyle(box);
  return {
    boxSize,
    textSize: textEl ? px(textEl) : null,
    h1: pick("h1"),
    h2: pick("h2"),
    body: px(document.body),
    textTransform: cs.textTransform,
    borderTopWidth: cs.borderTopWidth,
    paddingTop: cs.paddingTop,
    paddingLeft: cs.paddingLeft,
    collapsed: !!box.closest("details"),
    wording: box.textContent.replace(/\\s+/g, " ").trim() === expected,
    logoImg: !logo || !!logo.querySelector("img"),
    logoText: logo ? logo.textContent.trim() : "",
    offenders: offenders.slice(0, 8)
  };
})()`;

test("disclosure computed font-size is larger than every other element", async () => {
  emailPreview = `<!doctype html><meta charset="utf-8"><title>Email</title>${buildEmail({
    kind: "confirm",
    countyName: "Santa Cruz",
    windowStart: "2026-07-02",
    confirmUrl: "https://example.com/confirmReminder?token=abc",
    unsubscribeUrl: "https://example.com/unsubscribe?token=def",
    postal: "1 Market St, San Francisco, CA 94105"
  }).html}`;
  const server = await startServer();
  const port = server.address().port;
  const dir = mkdtempSync(join(tmpdir(), "sherwood-chrome-"));
  const debugPort = port + 1;
  let chrome;
  let ws;
  try {
    chrome = await startChrome(debugPort, dir);
    const client = connect(await pageSocket(debugPort));
    ws = client.ws;
    await client.ready;
    const viewports = [
      { name: "desktop", width: 1280, height: 900, mobile: false, box: 20, h1: 18, h2: 17, body: 16 },
      { name: "mobile", width: 375, height: 812, mobile: true, box: 18, h1: 17, h2: 16, body: 15 }
    ];
    const targets = pageNames().map(name => ({
      name,
      url: name === "scz/index.html" || name === "sc/index.html"
        ? `http://127.0.0.1:${port}/${name}?static=1`
        : `http://127.0.0.1:${port}/${name}`
    }));
    targets.push({ name: "email", url: `http://127.0.0.1:${port}/email-preview.html`, email: true });

    for (const viewport of viewports) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile
      });
      for (const target of targets) {
        await client.send("Page.navigate", { url: target.url });
        const started = Date.now();
        for (;;) {
          const ready = await client.send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
          if (ready.result.value === "complete") break;
          if (Date.now() - started > 10000) throw new Error(`load timeout ${target.name}`);
          await new Promise(r => setTimeout(r, 40));
        }
        const evaluated = await client.send("Runtime.evaluate", { expression: MEASURE, returnByValue: true });
        const measured = evaluated.result.value;
        const label = `${target.name} ${viewport.name}`;
        assert.equal(measured.error, undefined, label);
        assert.equal(measured.wording, true, label);
        assert.equal(measured.collapsed, false, label);
        assert.equal(measured.textTransform, "none", label);
        assert.equal(measured.borderTopWidth, "1px", label);
        assert.equal(measured.paddingTop, "11px", label);
        assert.equal(measured.paddingLeft, "16px", label);
        assert.equal(measured.logoImg, true, label);
        assert.equal(measured.logoText, "", label);
        const expectBox = target.email ? 20 : viewport.box;
        const expectH1 = target.email ? 18 : viewport.h1;
        const expectBody = target.email ? 16 : viewport.body;
        assert.equal(measured.boxSize, expectBox, label);
        assert.equal(measured.textSize, expectBox, `${label} disclosure text`);
        if (!target.email && measured.h1 != null) assert.equal(measured.h1, expectH1, `${label} h1`);
        if (target.email) assert.equal(measured.h1, expectH1, `${label} h1`);
        if (!target.email && measured.h2 != null) assert.equal(measured.h2, viewport.h2, `${label} h2`);
        if (target.name === "index.html") assert.equal(measured.body, expectBody, label);
        assert.deepEqual(measured.offenders, [], `${label} ${JSON.stringify(measured.offenders)}`);
      }
    }
  } finally {
    if (ws) ws.close();
    if (chrome) chrome.kill("SIGKILL");
    await new Promise(resolve => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
}, { timeout: 180000 });
