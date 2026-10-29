/* Scroll story + keep the closing address form in step with the county check. */
const story = document.querySelector("[data-story]");
if (story && "IntersectionObserver" in window) {
  const beats = [...story.querySelectorAll("[data-beat]")];
  const io = new IntersectionObserver(entries => {
    const hit = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (hit) story.dataset.active = hit.target.getAttribute("data-beat");
  }, { rootMargin: "-35% 0px -45% 0px", threshold: [0.2, 0.45, 0.7] });
  beats.forEach(beat => io.observe(beat));
}

const top = document.querySelector("#check-form");
const end = document.querySelector("#check-form-end");
if (top && end) {
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
