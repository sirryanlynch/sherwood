import { STATIONS, actState, cameraFrames, stationIndex, worldMarkup } from "./world.js";

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)");

/* Chromium previews were leaving the camera on the CSS timeline, which held each
   station like a separate slide. The scroll position always writes the transform. */
document.documentElement.classList.add("js-cam");

function runwayProgress(runway) {
  const rect = runway.getBoundingClientRect();
  const view = window.innerHeight || 1;
  const pin = rect.height - view;
  if (pin <= 0) return 0;
  const scrolled = Math.min(Math.max(-rect.top, 0), pin);
  return scrolled / pin;
}

function sampleCamera(progress) {
  const frames = cameraFrames();
  const t = Math.min(Math.max(progress, 0), 1);
  let prev = frames[0];
  for (let i = 1; i < frames.length; i++) {
    const next = frames[i];
    if (t <= next[0]) {
      const span = next[0] - prev[0] || 1;
      const u = (t - prev[0]) / span;
      return [
        prev[1][0] + (next[1][0] - prev[1][0]) * u,
        prev[1][1] + (next[1][1] - prev[1][1]) * u
      ];
    }
    prev = next;
  }
  return frames[frames.length - 1][1];
}

function mountWorld(runway) {
  const host = runway.querySelector("[data-world]");
  if (!host || host.dataset.mounted) return;
  host.dataset.mounted = "1";
  host.innerHTML = worldMarkup();
}

function bindRunway(runway) {
  mountWorld(runway);
  const route = runway.querySelector(".route");
  const rider = runway.querySelector(".rider");
  if (rider && route) {
    rider.style.offsetPath = `path('${route.getAttribute("d")}')`;
    rider.style.offsetRotate = "0deg";
  }
  runway._cam = {
    layers: [...runway.querySelectorAll(".layer")].map(el => [el, Number(el.dataset.k || 1)]),
    route,
    rider,
    env: runway.querySelector(".env-chip"),
    tags: runway.querySelector(".tags"),
    arm: runway.querySelector(".stamp-arm"),
    filed: runway.querySelector(".filed-mark")
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) runway.classList.toggle("is-live", entry.isIntersecting);
    }, { threshold: 0 });
    io.observe(runway);
  } else {
    runway.classList.add("is-live");
  }
}

function applyRunway(runway) {
  const progress = runwayProgress(runway);
  runway.style.setProperty("--p", progress.toFixed(4));
  if (REDUCE.matches) {
    runway.dataset.station = STATIONS[0];
    const cam = runway._cam;
    if (cam) cam.layers.forEach(([el]) => { el.style.transform = ""; });
    return;
  }
  const name = STATIONS[stationIndex(progress)];
  if (runway.dataset.station !== name) runway.dataset.station = name;
  const [x, y] = sampleCamera(progress);
  const cam = runway._cam;
  if (!cam) return;
  for (const [el, k] of cam.layers) {
    el.style.transform = `translate3d(${(x * k).toFixed(2)}px,${(y * k).toFixed(2)}px,0)`;
  }
  const act = actState(progress);
  if (cam.route) cam.route.style.strokeDashoffset = (1 - act.dist).toFixed(4);
  if (cam.rider) cam.rider.style.offsetDistance = `${(act.dist * 100).toFixed(2)}%`;
  if (cam.env) {
    cam.env.style.opacity = act.env.toFixed(3);
    cam.env.style.transform = `translate3d(0,${((1 - act.env) * -36).toFixed(1)}px,0)`;
  }
  if (cam.tags) cam.tags.style.opacity = act.tags.toFixed(3);
  if (cam.arm) cam.arm.style.transform = `rotate(${(-34 * (1 - act.arm)).toFixed(2)}deg)`;
  if (cam.filed) cam.filed.style.opacity = act.filed.toFixed(3);
}

function loop() {
  requestAnimationFrame(loop);
  document.querySelectorAll("[data-story]").forEach(applyRunway);
}

function bindEndCheck() {
  const top = document.querySelector("#check-form");
  const end = document.querySelector("#check-form-end");
  if (!top || !end) return;
  const held = document.querySelector("#check-end-held");
  const sync = () => {
    end.hidden = top.hidden;
    if (held) held.hidden = !top.hidden;
  };
  sync();
  new MutationObserver(sync).observe(top, { attributes: true, attributeFilter: ["hidden"] });
  const endInput = end.querySelector("input[name=address]");
  const topInput = top.querySelector("input[name=address]");
  if (endInput && topInput) {
    endInput.addEventListener("input", () => {
      if (topInput.value === endInput.value) return;
      topInput.value = endInput.value;
      topInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
}

function bindCheckDock() {
  const dock = document.querySelector("[data-check-dock]");
  const section = document.querySelector("#check");
  const go = dock && dock.querySelector("[data-dock-go]");
  if (!dock || !section || !go) return;
  const panel = section.querySelector(".check-hero-panel") || section;
  const runway = document.querySelector(".house-runway");
  const stage = runway && runway.querySelector(".stage");
  const narrow = window.matchMedia("(max-width: 900px)");
  const sync = () => {
    const check = document.querySelector("#check-form");
    const waiting = !!(check && check.hidden);
    go.textContent = waiting ? "Email me a reminder" : "Check my property";
    const view = window.innerHeight || 0;
    let onStory = false;
    if (stage) {
      const box = stage.getBoundingClientRect();
      onStory = box.top < 160 && box.bottom > view * 0.5;
    }
    const panelBox = panel.getBoundingClientRect();
    const sectionVisible = panelBox.top < view - 64 && panelBox.bottom > 88;
    dock.hidden = !narrow.matches || sectionVisible || onStory;
  };
  const tick = () => { sync(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const check = document.querySelector("#check-form");
  if (check) new MutationObserver(sync).observe(check, { attributes: true, attributeFilter: ["hidden"] });
  narrow.addEventListener("change", sync);
  go.addEventListener("click", () => {
    const checkForm = document.querySelector("#check-form");
    const waiting = checkForm && checkForm.hidden;
    const target = waiting
      ? document.querySelector("#county-reminder input[name=email]")
      : checkForm && checkForm.querySelector("input[name=address]");
    section.scrollIntoView({ behavior: REDUCE.matches ? "auto" : "smooth", block: "start" });
    if (target) target.focus({ preventScroll: true });
  });
  sync();
}

const stories = document.querySelectorAll("[data-story]");
stories.forEach(bindRunway);
bindEndCheck();
bindCheckDock();
if (stories.length) requestAnimationFrame(loop);
REDUCE.addEventListener("change", () => {
  document.querySelectorAll("[data-story]").forEach(runway => {
    if (REDUCE.matches) {
      runway.querySelectorAll(".layer").forEach(el => { el.style.transform = ""; });
      runway.dataset.station = STATIONS[0];
    }
  });
});

