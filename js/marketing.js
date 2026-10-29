import { STATIONS, cameraFrames, stationIndex, worldMarkup } from "./world.js";

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
  const world = runway.querySelector(".world");
  const route = runway.querySelector(".route");
  const rider = runway.querySelector(".rider");
  if (rider && route) {
    const d = route.getAttribute("d");
    rider.style.offsetPath = `path('${d}')`;
    rider.style.offsetRotate = "0deg";
  }
  runway._cam = { world, route, rider };

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
    if (cam && cam.world) cam.world.style.transform = "";
    return;
  }
  const name = STATIONS[stationIndex(progress)];
  if (runway.dataset.station !== name) runway.dataset.station = name;
  const [x, y] = sampleCamera(progress);
  const cam = runway._cam;
  if (!cam || !cam.world) return;
  cam.world.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  if (cam.route) cam.route.style.strokeDashoffset = (1 - progress).toFixed(4);
  if (cam.rider) cam.rider.style.offsetDistance = `${(progress * 100).toFixed(2)}%`;
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

document.querySelectorAll("[data-story]").forEach(bindRunway);
bindEndCheck();
requestAnimationFrame(loop);
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

