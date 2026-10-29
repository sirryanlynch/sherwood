/* Santa Cruz street, CAD symbols, one paper route. Camera is a pure function of scroll. */
export const STATIONS = ["check", "estimate", "file", "confirm"];

const FOCUS = [1120, 520];
const SPOTS = [
  [1180, 540],
  [1760, 660],
  [2460, 800],
  [1280, 560]
];

export const CAM = SPOTS.map(([x, y]) => [FOCUS[0] - x, FOCUS[1] - y]);

const HOLD = 0.1;
const TRAVEL = (1 - HOLD * CAM.length) / (CAM.length - 1);

export function cameraFrames() {
  const frames = [];
  let t = 0;
  for (let i = 0; i < CAM.length; i++) {
    frames.push([round(t), CAM[i]]);
    t += HOLD;
    frames.push([round(t), CAM[i]]);
    if (i < CAM.length - 1) t += TRAVEL;
  }
  return frames;
}

export function stationIndex(progress) {
  const frames = cameraFrames();
  let index = 0;
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const endHold = frames[i * 2 + 1][0];
    const startNext = frames[(i + 1) * 2][0];
    if (progress >= (endHold + startNext) / 2) index = i + 1;
  }
  return index;
}

/* Paper distance along the home → county → porch loop. Holds with the camera. */
export function paperDist(progress) {
  const keys = [[0, 0.03], [0.1, 0.03], [0.3, 0.3], [0.4, 0.3], [0.6, 0.58], [0.7, 0.58], [0.9, 0.98], [1, 0.98]];
  return sampleKeys(keys, progress);
}

export function actState(progress) {
  const p = clamp01(progress);
  return {
    env: clamp01((p - 0.015) / 0.085),
    tags: clamp01((p - 0.2) / 0.1),
    arm: clamp01((p - 0.42) / 0.18),
    filed: clamp01((p - 0.78) / 0.12),
    dist: paperDist(p)
  };
}

function sampleKeys(keys, progress) {
  const t = clamp01(progress);
  let prev = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const next = keys[i];
    if (t <= next[0]) {
      const span = next[0] - prev[0] || 1;
      const u = (t - prev[0]) / span;
      return prev[1] + (next[1] - prev[1]) * u;
    }
    prev = next;
  }
  return keys[keys.length - 1][1];
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function iso(x, y, z = 0) {
  return `${+(x - y).toFixed(1)},${+((x + y) * 0.5 - z).toFixed(1)}`;
}

function face(pts) {
  return pts.map(([x, y, z]) => iso(x, y, z || 0)).join(" ");
}

function bungalow() {
  const roof = "#b7b1a4";
  const peak = [0, 0, 64];
  const e = [[-78, -54, 42], [78, -54, 42], [78, 54, 42], [-78, 54, 42]];
  return `
    <polygon points="${face([[-70, -46, 0], [-70, 46, 0], [-70, 46, 42], [-70, -46, 42]])}" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[70, -46, 0], [70, 46, 0], [70, 46, 42], [70, -46, 42]])}" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-70, 46, 0], [70, 46, 0], [70, 46, 42], [-70, 46, 42]])}" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([e[0], e[1], peak])}" fill="${roof}" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([e[1], e[2], peak])}" fill="#c4beb2" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([e[2], e[3], peak])}" fill="#ada798" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([e[3], e[0], peak])}" fill="${roof}" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-46, 47, 16], [-18, 47, 16], [-18, 47, 30], [-46, 47, 30]])}" fill="#e7e1d6" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[18, 47, 0], [40, 47, 0], [40, 47, 28], [18, 47, 28]])}" fill="#1c2421"/>
    <polygon points="${face([[-78, 46, 4], [78, 46, 4], [92, 92, 4], [-92, 92, 4]])}" fill="#e7e1d6" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-78, 46, 4], [-78, 46, 22], [-92, 92, 22], [-92, 92, 4]])}" fill="#f6f2eb" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[78, 46, 4], [92, 92, 4], [92, 92, 22], [78, 46, 22]])}" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M${iso(-70, 78, 20)} L${iso(70, 100, 20)}" stroke="#1c2421" stroke-width="1.5" fill="none"/>
    <path d="M${iso(-40, 70, 8)} L${iso(-40, 70, 22)}" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M${iso(40, 70, 8)} L${iso(40, 70, 22)}" stroke="#1c2421" stroke-width="1.5"/>
  `;
}

function cypress(far) {
  const leaf = far ? "#8a8478" : "#3a443c";
  const leaf2 = far ? "#9a9488" : "#2c342f";
  const trunk = far ? "#6e6a62" : "#1c2421";
  return `
    <path d="M-1 22 C-8 -8 4 -46 10 -6 L12 24 Z" fill="${trunk}"/>
    <path d="M-52 -2 C-28 -22 18 -16 58 -4 C24 -18 -16 2 -52 -2 Z" fill="${leaf}"/>
    <path d="M-40 -16 C-8 -40 34 -36 56 -14 C26 -28 -6 -10 -40 -16 Z" fill="${leaf2}"/>
    <path d="M-22 -28 C6 -52 40 -46 44 -24 C20 -36 0 -22 -22 -28 Z" fill="${leaf}"/>
  `;
}

function county() {
  return `
    <polygon points="${face([[-110, -70, 0], [110, -70, 0], [110, 70, 0], [-110, 70, 0]])}" fill="#e7e1d6" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-96, -58, 0], [-96, 58, 0], [-96, 58, 78], [-96, -58, 78]])}" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[96, -58, 0], [96, 58, 0], [96, 58, 78], [96, -58, 78]])}" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-96, 58, 0], [96, 58, 0], [96, 58, 78], [-96, 58, 78]])}" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-110, -70, 78], [110, -70, 78], [110, 70, 78], [-110, 70, 78]])}" fill="#c4beb2" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-40, 59, 8], [-16, 59, 8], [-16, 59, 36], [-40, 59, 36]])}" fill="#e7e1d6" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[10, 59, 8], [34, 59, 8], [34, 59, 36], [10, 59, 36]])}" fill="#e7e1d6" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-70, 70, 0], [70, 70, 0], [86, 110, 0], [-86, 110, 0]])}" fill="#ded8ce" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="${face([[-24, 96, 16], [24, 96, 16], [24, 96, 28], [-24, 96, 28]])}" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
  `;
}

function packet() {
  return `
    <rect x="-22" y="-28" width="44" height="56" rx="2" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M-12 -10 H12 M-12 -2 H8 M-12 6 H10" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
  `;
}

const ROUTE = "M1180 640 C1400 690 1580 720 1760 740 C1980 770 2200 800 2460 860 C2280 900 1900 820 1500 760 C1360 730 1240 690 1180 660";

export function worldMarkup() {
  const tree = (x, y, scale, far) => `<g transform="translate(${x} ${y}) scale(${scale})">${far ? "" : `<g class="ambient cypress-sway">`}${cypress(far)}${far ? "" : "</g>"}</g>`;
  return `<svg class="world-svg" viewBox="0 0 1680 940" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
  <defs>
    <symbol id="bungalow" overflow="visible">${bungalow()}</symbol>
    <symbol id="packet" overflow="visible">${packet()}</symbol>
  </defs>
  <g class="layer layer-sky" data-k="0.14">
    <rect x="-900" y="-500" width="5200" height="1600" fill="#f4f1eb"/>
    <rect x="-900" y="40" width="5200" height="70" fill="#ebe6dc"/>
    <rect x="-900" y="150" width="5200" height="46" fill="#e3ddd2"/>
    <g class="ambient fog" opacity="0.9">
      <ellipse cx="400" cy="180" rx="280" ry="18" fill="#f7f4ee"/>
      <ellipse cx="1600" cy="240" rx="340" ry="16" fill="#f7f4ee"/>
    </g>
    ${tree(180, 300, 0.7, true)}
    ${tree(520, 250, 0.85, true)}
    ${tree(2100, 180, 0.75, true)}
    ${tree(2600, 220, 0.6, true)}
    <polygon points=" -200,420 900,250 1680,300 2500,220 3400,360 3400,470 -200,560" fill="#e4ddd2" stroke="#cfc8bc" stroke-width="1.5"/>
    <polygon points="-200,470 700,360 1500,400 2400,340 3400,430 3400,500 -200,590" fill="#ddd6cb"/>
  </g>
  <g class="layer layer-hills" data-k="0.38">
    <polygon points="-300,560 600,430 1300,500 2000,420 2800,510 3400,460 3400,640 -300,720" fill="#d9d3c8" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M-200 640 H3600" stroke="#c9d2cc" stroke-width="8" stroke-linecap="round"/>
  </g>
  <g class="layer layer-world" data-k="1">
    <polygon points="${face([[-260, -40, 0], [2900, -40, 0], [2900, 80, 0], [-260, 80, 0]])}" fill="#e6e0d4" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M${iso(-200, 20, 1)} L${iso(2800, 20, 1)}" stroke="#d5cfc3" stroke-width="1.5"/>
    <g transform="translate(760 430) scale(0.82)"><use href="#bungalow"/></g>
    <g class="station-anchor" data-anchor="check" transform="translate(1180 540)">
      <use href="#bungalow"/>
      <g transform="translate(20 70)">
        <g class="env-chip">
          <rect x="-16" y="-12" width="36" height="24" rx="2" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
          <path d="M-16 -12 L2 2 L20 -12" stroke="#1c2421" stroke-width="1.5" fill="none"/>
        </g>
      </g>
      <g class="tags">
        <g transform="translate(-120 -40)">
          <rect x="0" y="0" width="54" height="18" rx="9" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
          <text x="27" y="13" text-anchor="middle" fill="#1c2421" font-family="Outfit, Inter, sans-serif" font-size="9" font-weight="600">Assessed</text>
        </g>
        <g transform="translate(70 -20)">
          <rect x="0" y="0" width="48" height="18" rx="9" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
          <text x="24" y="13" text-anchor="middle" fill="#1c2421" font-family="Outfit, Inter, sans-serif" font-size="9" font-weight="600">Market</text>
        </g>
      </g>
      <g class="filed-mark" transform="translate(-10 108)">
        <rect x="0" y="0" width="46" height="16" rx="2" fill="none" stroke="#128f88" stroke-width="1.5"/>
        <text x="23" y="12" text-anchor="middle" fill="#128f88" font-family="Outfit, Inter, sans-serif" font-size="8" font-weight="700">FILED</text>
      </g>
    </g>
    <g transform="translate(1680 640) scale(0.78)"><use href="#bungalow"/></g>
    <g transform="translate(2060 730) scale(0.62)">
      <polygon points="${face([[-50, -36, 0], [50, -36, 0], [50, 36, 0], [-50, 36, 0]])}" fill="#e7e1d6" stroke="#1c2421" stroke-width="1.5"/>
      <polygon points="${face([[-44, -30, 0], [-44, 30, 0], [-44, 30, 32], [-44, -30, 32]])}" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
      <polygon points="${face([[44, -30, 0], [44, 30, 0], [44, 30, 32], [44, -30, 32]])}" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
      <polygon points="${face([[-44, 30, 0], [44, 30, 0], [44, 30, 32], [-44, 30, 32]])}" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <polygon points="${face([[-54, -36, 32], [54, -36, 32], [54, 36, 36], [-54, 36, 36]])}" fill="#b7b1a4" stroke="#1c2421" stroke-width="1.5"/>
    </g>
    <g transform="translate(980 470) scale(0.55)">
      <polygon points="${face([[-36, -16, 6], [36, -16, 6], [36, 16, 6], [-36, 16, 6]])}" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
      <polygon points="${face([[-36, 16, 6], [36, 16, 6], [36, 16, 22], [-36, 16, 22]])}" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <polygon points="${face([[36, -16, 6], [36, 16, 6], [36, 16, 22], [36, -16, 22]])}" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
      <circle cx="${iso(28, 10, 6).split(",")[0]}" cy="${iso(28, 10, 6).split(",")[1]}" r="5" fill="none" stroke="#1c2421" stroke-width="1.5"/>
    </g>
    <g transform="translate(900 620)">
      <path d="M0 0 V-28" stroke="#1c2421" stroke-width="1.5"/>
      <rect x="-8" y="-40" width="18" height="12" rx="1" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
    </g>
    ${tree(640, 390, 0.9, false)}
    ${tree(1500, 500, 1, false)}
    ${tree(2140, 640, 0.85, false)}
    <path id="appeal-route" class="route" pathLength="1" d="${ROUTE}"/>
    <g class="rider"><use href="#packet"/></g>
    <g class="station-anchor" data-anchor="file" transform="translate(2460 800)">
      ${county()}
      <text x="8" y="128" text-anchor="middle" fill="#1c2421" font-family="Outfit, Inter, sans-serif" font-size="13" font-weight="600">Clerk</text>
      <g transform="translate(70 20)">
        <g class="stamp-arm">
          <rect x="-5" y="-48" width="10" height="52" rx="3" fill="#128f88"/>
          <circle cx="0" cy="6" r="10" fill="none" stroke="#128f88" stroke-width="2"/>
        </g>
      </g>
    </g>
  </g>
  <g class="layer layer-fore" data-k="1.2">
    <g transform="translate(80 760)">${cypress(false)}</g>
    <g transform="translate(1520 860) scale(1.35)"><g class="ambient cypress-sway">${cypress(false)}</g></g>
    <path d="M40 820 H520" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M80 820 V760 M160 820 V748 M240 820 V756 M320 820 V744 M400 820 V762" stroke="#1c2421" stroke-width="1.5"/>
  </g>
</svg>`;
}
