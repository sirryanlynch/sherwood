import { STATIONS, cameraFrames, stationIndex, worldMarkup } from "./world.js";

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)");

function supportsScrollTimeline() {
  return typeof CSS !== "undefined" && (
    CSS.supports("animation-timeline", "scroll()") ||
    CSS.supports("animation-timeline", "view()")
  );
}

function installCameraKeyframes() {
  if (document.getElementById("world-camera")) return;
  const frames = cameraFrames();
  const body = frames.map(([t, [x, y]]) => {
    const pct = (t * 100).toFixed(2);
    return `${pct}%{transform:translate3d(${x}px,${y}px,0)}`;
  }).join("");
  const far = frames.map(([t, [x, y]]) => {
    const pct = (t * 100).toFixed(2);
    return `${pct}%{transform:translate3d(${(x * 0.55).toFixed(1)}px,${(y * 0.55).toFixed(1)}px,0)}`;
  }).join("");
  const near = frames.map(([t, [x, y]]) => {
    const pct = (t * 100).toFixed(2);
    return `${pct}%{transform:translate3d(${(x * 1.12).toFixed(1)}px,${(y * 1.12).toFixed(1)}px,0)}`;
  }).join("");
  const style = document.createElement("style");
  style.id = "world-camera";
  style.textContent = `@keyframes world-pan{${body}}@keyframes world-pan-far{${far}}@keyframes world-pan-near{${near}}`;
  document.head.appendChild(style);
}

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
  const reduce = () => REDUCE.matches;
  const timeline = supportsScrollTimeline();
  if (!timeline) document.documentElement.classList.add("no-scroll-timeline");

  const world = runway.querySelector(".world");
  const far = runway.querySelector(".layer-far");
  const near = runway.querySelector(".layer-near");

  let ticking = false;
  const apply = () => {
    ticking = false;
    if (reduce()) {
      runway.dataset.station = STATIONS[0];
      return;
    }
    const progress = runwayProgress(runway);
    const index = stationIndex(progress);
    const name = STATIONS[index];
    if (runway.dataset.station !== name) runway.dataset.station = name;
    if (timeline) return;
    const [x, y] = sampleCamera(progress);
    if (world) world.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    if (far) far.style.transform = `translate3d(${(x * 0.55).toFixed(2)}px,${(y * 0.55).toFixed(2)}px,0)`;
    if (near) near.style.transform = `translate3d(${(x * 1.12).toFixed(2)}px,${(y * 1.12).toFixed(2)}px,0)`;
    runway.style.setProperty("--p", progress.toFixed(4));
  };
  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };
  apply();
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) runway.classList.toggle("is-live", entry.isIntersecting);
    }, { threshold: 0 });
    io.observe(runway);
  } else {
    runway.classList.add("is-live");
  }
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

installCameraKeyframes();
document.querySelectorAll("[data-story]").forEach(bindRunway);
bindEndCheck();
REDUCE.addEventListener("change", () => {
  document.querySelectorAll("[data-story]").forEach(runway => {
    const world = runway.querySelector(".world");
    const far = runway.querySelector(".layer-far");
    const near = runway.querySelector(".layer-near");
    if (REDUCE.matches) {
      if (world) world.style.transform = "";
      if (far) far.style.transform = "";
      if (near) near.style.transform = "";
      runway.dataset.station = STATIONS[0];
    }
  });
});

