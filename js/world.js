/* One isometric appeal world. The camera is a pure function of scroll progress. */
export const STATIONS = ["check", "result", "plan", "intake", "sign", "file"];

/* Wide window (viewBox 1680×940). Stations sit ~440px apart so the next one stays in frame. */
const FOCUS = [1040, 500];
const SPOTS = [
  [1040, 500],
  [1480, 560],
  [1920, 620],
  [2360, 680],
  [2800, 740],
  [3240, 800]
];

export const CAM = SPOTS.map(([x, y]) => [FOCUS[0] - x, FOCUS[1] - y]);

const HOLD = 0.04;
const TRAVEL = (1 - HOLD * CAM.length) / (CAM.length - 1);

export function cameraFrames() {
  const frames = [];
  let t = 0;
  for (let i = 0; i < CAM.length; i++) {
    frames.push([t, CAM[i]]);
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

function routeD() {
  const pts = SPOTS.map(([x, y]) => [x, y + 36]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    d += ` C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }
  return d;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function grid() {
  const lines = [];
  for (let i = -12; i <= 86; i++) {
    const x = i * 52;
    lines.push(`M ${x} -280 L ${x + 1500} 470`);
    lines.push(`M ${x + 1500} -280 L ${x} 470`);
    lines.push(`M ${x} 360 L ${x + 1500} 1110`);
    lines.push(`M ${x + 1500} 360 L ${x} 1110`);
  }
  return lines.map(d => `<path d="${d}"/>`).join("");
}

function crate(x, y) {
  return `<g transform="translate(${x} ${y})">
    <polygon points="-28,8 8,-10 44,8 8,26" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="-28,8 8,26 8,46 -28,28" fill="#f6f2eb" stroke="#1c2421" stroke-width="1.5"/>
    <polygon points="8,26 44,8 44,28 8,46" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
    <path d="M16 16 H32" stroke="#f3d36b" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

const house = `
  <polygon points="-30,-95 190,15 30,95 -190,-15" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
  <polygon points="-20,-60 120,10 120,-38 -20,-108" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
  <polygon points="120,10 20,60 20,12 120,-38" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
  <polygon points="-20,-108 120,-38 0,-92" fill="#9fd4ce" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="120,-38 20,12 0,-92" fill="#128f88" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="20,12 -120,-58 0,-92" fill="#0f7f78" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="-120,-58 -20,-108 0,-92" fill="#b7ddd8" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="96,-2 112,6 112,-22 96,-30" fill="#128f88"/>
  <polygon points="90,9 74,17 74,1 90,-7" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
`;

export function worldMarkup() {
  const mids = SPOTS.slice(0, -1).map(([x, y], i) => {
    const [nx, ny] = SPOTS[i + 1];
    return [(x + nx) / 2, (y + ny) / 2 + 70];
  });
  return `<svg class="world-svg" viewBox="0 0 1680 940" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
  <g class="world">
    <g fill="none" stroke="#d5cfc3" stroke-width="1.5">${grid()}</g>
    <path id="appeal-route" class="route" pathLength="1" d="${routeD()}"/>
    ${mids.map(([x, y], i) => crate(x + (i % 2 ? 36 : -48), y)).join("")}
    <g class="rider">
      <rect x="-24" y="-30" width="48" height="60" rx="3" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M-12 -12 H14 M-12 -2 H8 M-12 8 H12" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g class="station-anchor" data-anchor="check" transform="translate(1040 500) scale(0.72)">
      <ellipse cx="10" cy="78" rx="120" ry="16" fill="#e6e0d4"/>
      ${house}
      <g class="ambient pin">
        <path d="M20 -10 V-46" stroke="#128f88" stroke-width="1.5"/>
        <circle class="pin-dot" cx="20" cy="-52" r="6" fill="#128f88"/>
        <circle cx="20" cy="-52" r="2.2" fill="#fffcf8"/>
      </g>
      <g class="ambient dots" fill="#128f88">
        <circle cx="-70" cy="-120" r="2.2"/>
        <circle cx="-54" cy="-132" r="1.5"/>
        <circle cx="-84" cy="-136" r="1.3"/>
        <circle cx="-46" cy="-112" r="1.2"/>
      </g>
    </g>
    <g class="station-anchor" data-anchor="result" transform="translate(1480 560) scale(0.72)">
      <ellipse cx="20" cy="120" rx="90" ry="14" fill="#e6e0d4"/>
      <g transform="translate(-20 8) rotate(-7)">
        <rect x="16" y="8" width="150" height="190" rx="6" fill="#f3efe8" stroke="#cfc8bc" stroke-width="1.5"/>
      </g>
      <g class="ambient sheet">
        <rect x="0" y="0" width="168" height="214" rx="8" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
        <rect x="0" y="0" width="168" height="36" rx="8" fill="#128f88"/>
        <rect x="0" y="22" width="168" height="14" fill="#128f88"/>
        <path d="M18 58 H120 M18 74 H140 M18 90 H100 M18 114 H130 M18 130 H90" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="18" y="156" width="52" height="28" rx="4" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
      </g>
    </g>
    <g class="station-anchor" data-anchor="plan" transform="translate(1920 620) scale(0.72)">
      <ellipse cx="30" cy="90" rx="110" ry="14" fill="#e6e0d4"/>
      <path d="M-90 40 L10 -10 L150 40 L50 100 Z" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M-90 40 L10 70 L50 100 L-10 130 L-90 80 Z" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M10 -10 L150 40 L150 90 L10 130 L10 70 Z" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
      <g transform="translate(20 -70)">
        <g class="ambient sheet">
          <rect width="120" height="150" rx="6" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
          <path d="M14 28 H90 M14 44 H70" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="14" y="70" width="40" height="28" rx="3" fill="#f3d36b"/>
          <rect x="62" y="70" width="40" height="28" rx="3" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
        </g>
      </g>
    </g>
    <g class="station-anchor" data-anchor="intake" transform="translate(2360 680) scale(0.72)">
      <ellipse cx="0" cy="80" rx="100" ry="14" fill="#e6e0d4"/>
      <g transform="scale(.72) translate(-40 -20)">${house}</g>
      <g transform="translate(70 -40) rotate(8)">
        <g class="ambient sheet">
          <rect width="92" height="112" rx="5" fill="#fffcf8" stroke="#128f88" stroke-width="1.5"/>
          <rect x="8" y="8" width="76" height="62" rx="3" fill="#d7efec"/>
          <path d="M16 62 L36 44 L52 56 L70 36 L84 62" stroke="#128f88" stroke-width="1.5" fill="none"/>
        </g>
      </g>
      <g transform="translate(28 10) rotate(-8)">
        <rect width="72" height="88" rx="5" fill="#fffcf8" stroke="#cfc8bc" stroke-width="1.5"/>
        <rect x="8" y="8" width="56" height="48" rx="3" fill="#f3efe8"/>
      </g>
    </g>
    <g class="station-anchor" data-anchor="sign" transform="translate(2800 740) scale(0.72)">
      <ellipse cx="10" cy="110" rx="100" ry="14" fill="#e6e0d4"/>
      <g transform="rotate(-5)">
        <rect x="-20" y="-20" width="200" height="230" rx="8" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
        <path d="M0 16 H120 M0 36 H150 M0 64 H100" stroke="#e0dad0" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M4 120 C30 96 48 140 74 112 S120 90 150 124" stroke="#1c2421" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M4 140 H150" stroke="#128f88" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <g transform="translate(150 20) rotate(28)">
        <rect width="12" height="92" rx="6" fill="#128f88"/>
        <path d="M6 92 L0 112 L12 112 Z" fill="#1c2421"/>
      </g>
    </g>
    <g class="station-anchor" data-anchor="file" transform="translate(3240 800) scale(0.72)">
      <ellipse cx="20" cy="100" rx="120" ry="16" fill="#e6e0d4"/>
      <path d="M-80 20 L40 -40 L40 120 L-80 170 Z" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M40 -40 L170 10 L170 160 L40 120 Z" fill="#f6f2eb" stroke="#1c2421" stroke-width="1.5"/>
      <rect x="-40" y="40" width="40" height="52" rx="3" fill="#fffcf8" stroke="#cfc8bc" stroke-width="1.5"/>
      <rect x="70" y="60" width="52" height="64" rx="3" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
      <g transform="translate(150 -20)">
        <g class="ambient stamp-seal">
          <circle cx="0" cy="0" r="46" fill="#fffcf8" stroke="#128f88" stroke-width="1.5"/>
          <circle cx="0" cy="0" r="36" stroke="#128f88" stroke-width="1.5"/>
          <text x="0" y="-4" text-anchor="middle" fill="#128f88" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="700">VALUE</text>
          <text x="0" y="12" text-anchor="middle" fill="#128f88" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="700">LOWERED</text>
        </g>
      </g>
    </g>
  </g>
</svg>`;
}
